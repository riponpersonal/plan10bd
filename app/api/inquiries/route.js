import { NextResponse } from 'next/server';
import { getDataStore, addInquiry, deleteInquiry } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  const store = getDataStore();
  return NextResponse.json({ success: true, inquiries: store.inquiries });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newInq = addInquiry(body);
    return NextResponse.json({ success: true, inquiry: newInq, message: 'Inquiry sent successfully.' });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to send inquiry.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Inquiry ID is required.' }, { status: 400 });
    }
    const deleted = deleteInquiry(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Inquiry record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Inquiry ${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete inquiry.' }, { status: 500 });
  }
}
