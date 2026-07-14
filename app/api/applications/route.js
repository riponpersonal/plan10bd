import { NextResponse } from 'next/server';
import { getDataStore, addApplication, updateApplicationStatus, deleteApplication } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { validateApplication, sanitizeObject } from '@/app/lib/validate';
import { requireAdmin } from '@/app/lib/session';

// ✅ SECURITY FIX: GET now requires admin auth (was publicly accessible before, leaking NID/phone data)
export async function GET(request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
  }
  const store = getDataStore();
  return NextResponse.json({ success: true, applications: store.applications });
}

export async function POST(request) {
  try {
    // CSRF check for public form submissions
    if (!validateOrigin(request)) return csrfDenied();

    const rawBody = await request.json();
    // Sanitize all string inputs
    const body = sanitizeObject(rawBody);

    // Validate input
    const validation = validateApplication(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.errors.join(' ') },
        { status: 400 }
      );
    }

    const newApp = addApplication(body);
    return NextResponse.json({ success: true, application: newApp, message: 'Application submitted successfully.' });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to submit application.' }, { status: 400 });
  }
}

export async function PATCH(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    // ✅ SECURITY FIX: Removed x-admin-role header fallback
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can update applications.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Application ID and status are required.' }, { status: 400 });
    }

    const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status value.' }, { status: 400 });
    }

    const updated = updateApplicationStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Application not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, application: updated, message: `Application status updated to ${status}.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to update status.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Application ID is required.' }, { status: 400 });
    }
    const deleted = deleteApplication(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Application record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Application ${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete application.' }, { status: 500 });
  }
}
