import { NextResponse } from 'next/server';
import { getAllUsersWithRoles, updateUserAdminRole } from '@/app/lib/dataStore';
import { requireAdmin } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';

export async function GET(request) {
  try {
    // ✅ SECURITY FIX: Require admin session (was completely unprotected before)
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }
    const users = await getAllUsersWithRoles();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // ✅ SECURITY FIX: Require CSRF + admin session (was completely unprotected before)
    if (!validateOrigin(request)) return csrfDenied();
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, role } = body;

    if (!username || !role) {
      return NextResponse.json({ success: false, message: 'Username and role are required' }, { status: 400 });
    }

    const success = await updateUserAdminRole(username, role);
    if (!success) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Successfully updated ${username} role to ${role}` });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update user role' }, { status: 500 });
  }
}
