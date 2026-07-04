import { NextResponse } from 'next/server';
import { verifySessionToken, getSessionCookieName, getSessionCookieOptions, createSessionToken } from '@/app/lib/session';
import { findUserById } from '@/app/lib/dataStore';

const COOKIE_NAME = getSessionCookieName();

/**
 * GET /api/auth/session
 * Returns the current session user if the session cookie is valid.
 * Used by admin layout and protected pages to verify authentication.
 */
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      })
    );

    const token = cookies[COOKIE_NAME];
    if (!token) {
      return NextResponse.json({ success: false, message: 'No active session.' }, { status: 401 });
    }

    const { valid, payload, expired } = verifySessionToken(token);

    if (!valid) {
      if (expired) {
        return NextResponse.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 });
      }
      return NextResponse.json({ success: false, message: 'Invalid session.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        username: payload.username,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Session check failed.' }, { status: 500 });
  }
}

/**
 * POST /api/auth/session
 * Body: { action: 'logout' }
 * Clears the session cookie (logout).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
      const opts = getSessionCookieOptions(true); // clear = true
      response.cookies.set(COOKIE_NAME, '', {
        httpOnly: opts.httpOnly,
        secure: opts.secure,
        sameSite: opts.sameSite,
        path: opts.path,
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Logout failed.' }, { status: 500 });
  }
}
