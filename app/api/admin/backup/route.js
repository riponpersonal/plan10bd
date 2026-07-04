import { NextResponse } from 'next/server';
import { getDataStore, importDataStore, resetDataStore, addSystemLog } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { verifySessionToken, getSessionCookieName } from '@/app/lib/session';

const COOKIE_NAME = getSessionCookieName();

function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const { valid, payload } = verifySessionToken(token);
  return valid ? payload : null;
}

function checkAdminSession(request) {
  const session = getSessionFromRequest(request);
  if (session && session.role === 'ADMIN') return true;
  // Fallback: legacy x-admin-role header (kept for backward compat during transition)
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET(request) {
  try {
    // CSRF check for data export
    if (!validateOrigin(request)) return csrfDenied();
    if (!checkAdminSession(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const store = getDataStore();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Local Client';
    addSystemLog('Database JSON Exported', ip, 'Success');
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    console.error('Failed to export data store:', error);
    return NextResponse.json({ success: false, message: 'Failed to export data store' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // CSRF check
    if (!validateOrigin(request)) return csrfDenied();
    if (!checkAdminSession(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, data } = body;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Local Client';

    if (action === 'reset') {
      resetDataStore();
      addSystemLog('Factory Reset Executed', ip, 'Success');
      return NextResponse.json({ success: true, message: 'System data reset completed successfully.' });
    } else if (action === 'import') {
      if (!data) {
        addSystemLog('Database Restore Failed (Empty Payload)', ip, 'Failure');
        return NextResponse.json({ success: false, message: 'Import data payload is missing.' }, { status: 400 });
      }
      try {
        importDataStore(data);
        addSystemLog('Database Restored from JSON Backup', ip, 'Success');
        return NextResponse.json({ success: true, message: 'System database restored successfully.' });
      } catch (validationError) {
        addSystemLog(`Database Restore Failed (${validationError.message})`, ip, 'Failure');
        return NextResponse.json({ success: false, message: validationError.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid action requested.' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error in admin backup route:', error);
    return NextResponse.json({ success: false, message: error.message || 'An error occurred during operation.' }, { status: 500 });
  }
}
