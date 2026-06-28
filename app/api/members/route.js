import { NextResponse } from 'next/server';
import { getDataStore, deleteMember } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  const store = getDataStore();
  return NextResponse.json({ success: true, members: store.members });
}

export async function DELETE(request) {
  try {
    if (!checkAdminRole(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ success: false, message: 'Member ID is required.' }, { status: 400 });
    }
    const deleted = deleteMember(memberId);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Member record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Member ${memberId} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete member.' }, { status: 500 });
  }
}
