import { NextResponse } from 'next/server';
import { getDataStore, deleteMember } from '@/app/lib/dataStore';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';
import { verifySessionToken, getSessionCookieName } from '@/app/lib/session';

const COOKIE_NAME = getSessionCookieName();

function checkAdminRole(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (token) {
    const { valid, payload } = verifySessionToken(token);
    if (valid && payload?.role === 'ADMIN') return true;
  }
  // Fallback: legacy header
  return request.headers.get('x-admin-role') === 'ADMIN';
}

export async function GET() {
  const store = getDataStore();
  
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
