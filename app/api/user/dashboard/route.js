import { NextResponse } from 'next/server';
import { getUserDashboardData, findUserById } from '@/app/lib/dataStore';
import { getSessionFromRequest } from '@/app/lib/session';

export async function GET(request) {
  try {
    // ✅ SECURITY FIX: Require authenticated session (was completely unprotected before)
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Please log in to access your dashboard.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('username') || searchParams.get('phone') || searchParams.get('memberId');

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'User identifier (username, phone, or memberId) is required.' },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Ensure users can only access their own dashboard (admins can access any)
    if (session.role !== 'ADMIN') {
      const reqClean = identifier.trim().toLowerCase();
      let isOwn = (
        reqClean === (session.username || '').toLowerCase() ||
        reqClean === (session.phone || '').toLowerCase() ||
        reqClean === (session.id || '').toLowerCase()
      );

      if (!isOwn && session.phone) {
        const targetUser = await findUserById(identifier);
        if (targetUser && targetUser.phone && targetUser.phone.trim() === session.phone.trim()) {
          isOwn = true;
        }
      }

      if (!isOwn) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You can only access your own dashboard.' },
          { status: 403 }
        );
      }
    }

    const dashboardData = await getUserDashboardData(identifier);

    if (!dashboardData) {
      return NextResponse.json(
        { success: false, message: 'User dashboard record not found.' },
        { status: 404 }
      );
    }

    // ✅ Sanitize data for regular users: hide official memberId/username and expose publicId instead
    if (session.role !== 'ADMIN') {
      if (dashboardData.member) {
        const pId = dashboardData.member.publicId || dashboardData.member.memberId;
        dashboardData.member = {
          ...dashboardData.member,
          memberId: pId
        };
      }
      if (dashboardData.user) {
        const pId = dashboardData.user.publicId || dashboardData.user.username;
        dashboardData.user = {
          ...dashboardData.user,
          username: pId
        };
      }
      if (dashboardData.accounts) {
        dashboardData.accounts = dashboardData.accounts.map(acc => ({
          ...acc,
          publicDisplayId: acc.publicId || acc.username
        }));
      }

      const sanitizeTree = (nodes) => {
        if (!nodes) return [];
        return nodes.map(node => ({
          ...node,
          memberId: node.publicId || node.memberId,
          children: sanitizeTree(node.children)
        }));
      };

      if (dashboardData.referrals) {
        const pId = (dashboardData.member && dashboardData.member.publicId) || dashboardData.referrals.referralCode;
        dashboardData.referrals = {
          ...dashboardData.referrals,
          referralCode: pId,
          tree: sanitizeTree(dashboardData.referrals.tree)
        };
      }

      if (dashboardData.buyerReferrals) {
        const pId = (dashboardData.member && dashboardData.member.publicId) || dashboardData.buyerReferrals.referralCode;
        dashboardData.buyerReferrals = {
          ...dashboardData.buyerReferrals,
          referralCode: pId,
          tree: sanitizeTree(dashboardData.buyerReferrals.tree)
        };
      }

      const sanitizeBinaryNode = (node) => {
        if (!node) return null;
        return {
          ...node,
          memberId: node.publicId || node.memberId,
          left: sanitizeBinaryNode(node.left),
          right: sanitizeBinaryNode(node.right)
        };
      };

      if (dashboardData.investorBinaryTree) {
        dashboardData.investorBinaryTree = sanitizeBinaryNode(dashboardData.investorBinaryTree);
      }
      if (dashboardData.buyerBinaryTree) {
        dashboardData.buyerBinaryTree = sanitizeBinaryNode(dashboardData.buyerBinaryTree);
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching user dashboard data:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error fetching dashboard.' },
      { status: 500 }
    );
  }
}
