import { NextResponse } from 'next/server';
import { getDataStore, deleteMember, createMemberAccount, adminPlaceMemberInTree } from '@/app/lib/dataStore';
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
    // Prefer the explicitly stored category (set at account creation) as the
    // authoritative source. Only fall back to derived classification for legacy
    // members that have no stored category, so an Investor is never mislabeled "Both".
    const STORED_CATEGORIES = ['INVESTOR', 'BUYER', 'BOTH'];
    if (STORED_CATEGORIES.includes(member.category)) {
      return { ...member, category: member.category };
    }

    // Check if they have an approved investment application or non-zero capital or are in the investor tree
    const hasInvestmentApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Investment' && app.status === 'APPROVED'
    );
    const isInInvestorTree = member.investorParent !== null && member.investorParent !== undefined && member.investorParent !== '';
    const isInvestor = member.capitalInvested > 0 || hasInvestmentApp || isInInvestorTree;

    // Check if they have an approved buyer application or any orders under their memberId
    const hasBuyerApp = store.applications.some(
      app => app.phone === member.phone && app.purpose === 'Buy Product' && app.status === 'APPROVED'
    );
    const hasOrders = store.orders.some(
      order => order.username === member.memberId
    );
    // Only in buyer tree if explicitly placed there (buyerParent is set to a non-empty value)
    const isInBuyerTree = member.buyerParent !== null && member.buyerParent !== undefined && member.buyerParent !== '';
    const isBuyer = hasBuyerApp || hasOrders || isInBuyerTree;

    let category = 'BOTH';
    if (isInvestor && !isBuyer) {
      category = 'INVESTOR';
    } else if (!isInvestor && isBuyer) {
      category = 'BUYER';
    } else if (!isInvestor && !isBuyer) {
      category = member.capitalInvested > 0 ? 'INVESTOR' : 'BUYER';
    }

    // DEBUG — log only when category is BOTH but user might expect otherwise
    if (isInvestor && !isBuyer && category !== 'INVESTOR') {
      console.log(`[CLASSIFY DEBUG] member=${member.memberId} isInvestor=${isInvestor} isBuyer=${isBuyer} cap=${member.capitalInvested}`);
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

/**
 * PUT /api/members — Admin tree placement
 * Body: { memberId, treeType: 'buyer'|'investor', side: 'left'|'right', parentId?: string }
 * Places an unplaced member under a parent node (defaults to Company root) in the binary tree.
 */
export async function PUT(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, treeType, side, parentId } = body;

    if (!memberId || !treeType || !side) {
      return NextResponse.json({ success: false, message: 'memberId, treeType, and side are required.' }, { status: 400 });
    }

    if (treeType !== 'buyer' && treeType !== 'investor') {
      return NextResponse.json({ success: false, message: 'treeType must be "buyer" or "investor".' }, { status: 400 });
    }

    if (side !== 'left' && side !== 'right') {
      return NextResponse.json({ success: false, message: 'side must be "left" or "right".' }, { status: 400 });
    }

    const result = await adminPlaceMemberInTree(treeType, memberId, side, parentId);
    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    console.error('Error in admin tree placement:', err);
    return NextResponse.json({ success: false, message: 'Failed to place member in tree.' }, { status: 500 });
  }
}

