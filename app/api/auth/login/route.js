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
    } else if (user.role === 'PENDING_USER') {
      return NextResponse.json({
        success: true,
        role: 'PENDING_USER',
        username: user.username,
        name: user.name,
        redirectUrl: '/dashboard',
        message: `Welcome ${user.name}! Your SPL Investment Application is currently PENDING verification.`
      });
    } else {
      return NextResponse.json({
        success: true,
        role: 'USER',
        username: user.username,
        name: user.name,
        redirectUrl: '/dashboard',
        message: `Welcome back, ${user.name}! Opening your User Dashboard...`
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server authentication error.' },
      { status: 500 }
    );
  }
}
