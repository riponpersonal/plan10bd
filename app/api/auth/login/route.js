import { NextResponse } from 'next/server';
import { findUserByCredentials } from '@/app/lib/dataStore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const user = findUserByCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials. Please verify username and password.' },
        { status: 401 }
      );
    }

    // Role identification logic
    if (user.role === 'ADMIN') {
      return NextResponse.json({
        success: true,
        role: 'ADMIN',
        username: user.username,
        name: user.name,
        redirectUrl: '/admin',
        message: 'Welcome Corporate Admin! Redirecting to Control Panel...'
      });
    }

    // Block pending or unapproved applications from logging in
    if (user.role === 'PENDING_USER' || (user.appStatus && user.appStatus !== 'APPROVED')) {
      if (user.appStatus === 'REJECTED') {
        const rejectMsg = user.appPurpose === 'Buy Product'
          ? 'Login failed: Your account registration was rejected because your product order was declined.'
          : 'Login failed: Your application has been rejected by the admin panel.';
        return NextResponse.json(
          { success: false, message: rejectMsg },
          { status: 403 }
        );
      }

      const pendingMsg = user.appPurpose === 'Buy Product'
        ? 'Login failed: Your account is pending admin approval. You will be able to log in once the admin accepts your product order.'
        : 'Login failed: Your application is currently pending admin approval. You can only log in once an admin approves your application.';

      return NextResponse.json(
        { success: false, message: pendingMsg },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      role: 'USER',
      username: user.username,
      name: user.name,
      redirectUrl: '/dashboard',
      message: `Welcome back, ${user.name}! Opening your User Dashboard...`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server authentication error.' },
      { status: 500 }
    );
  }
}
