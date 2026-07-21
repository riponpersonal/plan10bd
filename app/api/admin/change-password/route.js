import { NextResponse } from 'next/server';
import { updateUserPassword } from '@/app/lib/dataStore';
import { requireAdmin } from '@/app/lib/session';
import { validateOrigin, csrfDenied } from '@/app/lib/csrf';

export async function POST(request) {
  try {
    if (!validateOrigin(request)) return csrfDenied();

    // ✅ SECURITY FIX: Require admin session
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, newPassword } = body;

    if (!username || !newPassword) {
      return NextResponse.json({ success: false, message: 'Username and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const success = await updateUserPassword(username, newPassword);
    if (!success) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Successfully updated password for ${username}.` });
  } catch (error) {
    console.error('Error updating user password:', error);
    return NextResponse.json({ success: false, message: 'Failed to update user password.' }, { status: 500 });
  }
}
