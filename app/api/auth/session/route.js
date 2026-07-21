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
        publicId: payload.publicId || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Session check failed.' }, { status: 500 });
  }
}

/**
 * POST /api/auth/session
 * Body: { action: 'logout' } or { action: 'switch_account', targetUsername: string }
 * Clears the session cookie or switches session to another sibling username under the same phone.
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

    if (body.action === 'switch_account') {
      const { targetUsername } = body;
      if (!targetUsername) {
        return NextResponse.json({ success: false, message: 'Target username is required.' }, { status: 400 });
      }

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

      const { valid, payload } = verifySessionToken(token);
      if (!valid || !payload.phone) {
        return NextResponse.json({ success: false, message: 'Invalid session or phone number.' }, { status: 401 });
      }

      // Find the target user
      const targetUser = await findUserById(targetUsername);
      if (!targetUser) {
        return NextResponse.json({ success: false, message: 'Target user not found.' }, { status: 404 });
      }

      // Check if target user's phone matches current session's phone
      if (targetUser.phone !== payload.phone) {
        return NextResponse.json({ success: false, message: 'Unauthorized: Phone numbers do not match.' }, { status: 403 });
      }

      // Create new session token for the target user
      const sessionToken = createSessionToken(targetUser);
      const cookieOpts = getSessionCookieOptions();

      const response = NextResponse.json({
        success: true,
        user: {
          username: targetUser.username,
          name: targetUser.name,
          role: targetUser.role,
          publicId: targetUser.publicId || null,
        },
        message: `Successfully switched to account ${targetUser.name}`
      });

      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        maxAge: cookieOpts.maxAge,
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Session post failed:', error);
    return NextResponse.json({ success: false, message: 'Action failed.' }, { status: 500 });
  }
}
