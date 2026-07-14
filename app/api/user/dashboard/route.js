import { NextResponse } from 'next/server';
import { getUserDashboardData } from '@/app/lib/dataStore';
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
      const isOwn = (
        reqClean === (session.username || '').toLowerCase() ||
        reqClean === (session.phone || '').toLowerCase() ||
        reqClean === (session.id || '').toLowerCase()
      );
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
