import { NextResponse } from 'next/server';
import { getAllUsersWithRoles, updateUserAdminRole } from '@/app/lib/dataStore';

export async function GET() {
  try {
    const users = getAllUsersWithRoles();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, role } = body;

    if (!username || !role) {
      return NextResponse.json({ success: false, message: 'Username and role are required' }, { status: 400 });
    }

    const success = updateUserAdminRole(username, role);
    if (!success) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Successfully updated ${username} role to ${role}` });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update user role' }, { status: 500 });
  }
}
