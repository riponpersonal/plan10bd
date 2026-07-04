import { NextResponse } from 'next/server';
import { getDataStore, updatePayoutStatus, deletePayout, getPayouts } from '@/app/lib/dataStore';

function checkAdminRole(request) {
  const role = request.headers.get('x-admin-role');
  return role === 'ADMIN';
}

export async function GET() {
  const payouts = getPayouts();
  return NextResponse.json({ success: true, payouts });
}

export async function PATCH(request) {
  try {
    const { id, status } = await request.json();
    const payout = updatePayoutStatus(id, status);
    if (payout) {
      return NextResponse.json({ success: true, payout, message: `Payout status updated to ${status}.` });
    }
    return NextResponse.json({ success: false, message: 'Payout record not found.' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to update payout.' }, { status: 500 });
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
      return NextResponse.json({ success: false, message: 'Payout ID is required.' }, { status: 400 });
    }
    const deleted = deletePayout(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Payout record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Payout ${id} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete payout.' }, { status: 500 });
  }
}
