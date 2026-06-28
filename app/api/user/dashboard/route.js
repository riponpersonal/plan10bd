import { NextResponse } from 'next/server';
import { getUserDashboardData } from '@/app/lib/dataStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('username') || searchParams.get('phone') || searchParams.get('memberId');

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: 'User identifier (username, phone, or memberId) is required.' },
        { status: 400 }
      );
    }

    const dashboardData = getUserDashboardData(identifier);

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
