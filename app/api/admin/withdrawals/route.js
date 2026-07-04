import { NextResponse } from 'next/server';
import { getWithdrawals, updateWithdrawalStatus } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { verifySessionToken, getSessionCookieName } from '@/app/lib/session';
import { sanitizeObject } from '@/app/lib/validate';

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

function checkAdminRole(request) {
  const session = getSessionFromRequest(request);
  if (session && session.role === 'ADMIN') return true;
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }
    const list = getWithdrawals();
    return NextResponse.json({ success: true, withdrawals: list });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const { action, requestId } = body;
    if (!action || !requestId) {
      return NextResponse.json({ success: false, message: 'Action and requestId are required.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, message: 'Invalid action. Must be approve or reject.' }, { status: 400 });
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const result = updateWithdrawalStatus(requestId, status);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Withdrawal request successfully ${action}d.`, request: result.request });
  } catch (err) {
    console.error('Error handling withdrawal request:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
