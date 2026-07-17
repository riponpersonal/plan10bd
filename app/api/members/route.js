import { NextResponse } from 'next/server';
import { getDataStore, deleteMember, createMemberAccount } from '@/app/lib/dataStore';
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
    // Check if they have an approved investment application or non-zero capital or are in the investor tree
    const hasInvestmentApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Investment' && app.status === 'APPROVED'
    );
    const isInInvestorTree = member.memberId === 'Plan10-101' || (member.investorParent !== null && member.investorParent !== undefined);
    const isInvestor = hasInvestmentApp || (member.capitalInvested > 0) || isInInvestorTree;

    // Check if they have an approved buyer application or any orders or are in the buyer tree
    const hasBuyerApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Buy Product' && app.status === 'APPROVED'
    );
    const hasOrders = store.orders.some(
      order => order.phone === member.phone || order.userId === member.memberId || order.memberId === member.memberId
    );
    const isInBuyerTree = member.memberId === 'Plan10-101' || (member.buyerParent !== null && member.buyerParent !== undefined);
    const isBuyer = hasBuyerApp || hasOrders || isInBuyerTree;

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

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    
    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, password, category } = body;

    if (!name || !phone || !password || !category) {
      return NextResponse.json({ success: false, message: 'Name, phone, password, and category are required.' }, { status: 400 });
    }

    if (category !== 'BUYER' && category !== 'INVESTOR' && category !== 'BOTH') {
      return NextResponse.json({ success: false, message: 'Invalid category. Must be BUYER, INVESTOR, or BOTH.' }, { status: 400 });
    }

    const newMember = await createMemberAccount(body);
    return NextResponse.json({ success: true, member: newMember, message: 'Account created successfully.' });
  } catch (err) {
    console.error('Error creating member account:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to create member account.' }, { status: 500 });
  }
}

