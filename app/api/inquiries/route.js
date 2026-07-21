import { NextResponse } from 'next/server';
import { getDataStore, addInquiry, deleteInquiry } from '@/app/lib/dataStore';
import { requireAdmin } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { validateInquiry, sanitizeObject } from '@/app/lib/validate';

export async function GET(request) {
  // ✅ SECURITY FIX: Require admin session (was completely public before!)
  if (!requireAdmin(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
  }
  const store = await getDataStore();
  return NextResponse.json({ success: true, inquiries: store.inquiries });
}

export async function POST(request) {
  try {
    // ✅ SECURITY: Require same-origin CSRF check
    if (!validateOrigin(request)) return csrfDenied();

    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    // Validate input
    const validation = validateInquiry(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.errors.join(' ') },
        { status: 400 }
      );
    }

    const newInq = await addInquiry(body);
    return NextResponse.json({ success: true, inquiry: newInq, message: 'Inquiry sent successfully.' });
  } catch (err) {
    console.error('Inquiry submission error:', err);
    return NextResponse.json({ success: false, message: 'Failed to send inquiry.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Inquiry ID is required.' }, { status: 400 });
    }
    const deleted = await deleteInquiry(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Inquiry record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Inquiry ${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete inquiry.' }, { status: 500 });
  }
}
