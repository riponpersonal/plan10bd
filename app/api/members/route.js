import { NextResponse } from 'next/server';
import { getDataStore, deleteMember } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { requireAdmin } from '@/app/lib/session';

export async function GET(request) {
  // ✅ SECURITY FIX: Require admin session (was completely public before!)
  if (!requireAdmin(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
  }

  const store = await getDataStore();
  
  // Classify each member dynamically
  const enrichedMembers = store.members.map(member => {
    // Check if they have an approved investment application or non-zero capital
    const hasInvestmentApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Investment' && app.status === 'APPROVED'
    );
    const isInvestor = hasInvestmentApp || (member.capitalInvested > 0);

    // Check if they have an approved buyer application or any orders
    const hasBuyerApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Buy Product' && app.status === 'APPROVED'
    );
    const hasOrders = store.orders.some(
      order => order.phone === member.phone || order.userId === member.memberId || order.memberId === member.memberId
    );
    const isBuyer = hasBuyerApp || hasOrders;

    let category = 'BOTH';
    if (isInvestor && !isBuyer) {
      category = 'INVESTOR';
    } else if (!isInvestor && isBuyer) {
      category = 'BUYER';
    } else if (!isInvestor && !isBuyer) {
      category = member.capitalInvested > 0 ? 'INVESTOR' : 'BUYER';
    }

    return {
      ...member,
      category
    };
  });

  return NextResponse.json({ success: true, members: enrichedMembers });
}

export async function DELETE(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Only admin can delete data.' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ success: false, message: 'Member ID is required.' }, { status: 400 });
    }
    const deleted = await deleteMember(memberId);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Member record not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Member ${memberId} deleted successfully.` });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Failed to delete member.' }, { status: 500 });
  }
}
