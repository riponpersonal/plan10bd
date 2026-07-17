import { NextResponse } from 'next/server';
import { findUserByCredentials } from '@/app/lib/dataStore';
import { checkRateLimit, recordFailedAttempt, clearRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { validateLoginInput } from '@/app/lib/validate';
import { createSessionToken, getSessionCookieName, getSessionCookieOptions } from '@/app/lib/session';

const COOKIE_NAME = getSessionCookieName();

export async function POST(request) {
  const ip = getClientIp(request);

  // 1. Rate limiting check
  const rateCheck = checkRateLimit(ip);
  if (rateCheck.limited) {
    const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed login attempts. Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) before trying again.`
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }

  try {
    const body = await request.json();

    // 2. Input validation
    const validation = validateLoginInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.errors[0] },
        { status: 400 }
      );
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const user = await findUserByCredentials(username, password);

    if (!user) {
      // Record failed attempt for rate limiting
      recordFailedAttempt(ip);
      const updatedCheck = checkRateLimit(ip);
      const attemptsLeft = updatedCheck.attemptsLeft;

      return NextResponse.json(
        {
          success: false,
          message: `Invalid credentials. Please verify username and password.${attemptsLeft > 0 && attemptsLeft <= 2 ? ` (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before temporary lockout)` : ''}`
        },
        { status: 401 }
      );
    }

    // Clear rate limit on successful credential match
    clearRateLimit(ip);

    // Role identification logic
    if (user.role === 'ADMIN') {
      const sessionToken = createSessionToken(user);
      const cookieOpts = getSessionCookieOptions();

      const response = NextResponse.json({
        success: true,
        role: 'ADMIN',
        username: user.username,
        name: user.name,
        redirectUrl: '/admin',
        message: 'Welcome Corporate Admin! Redirecting to Control Panel...'
      });

      // Set httpOnly session cookie for admin
      response.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        maxAge: cookieOpts.maxAge,
      });

      return response;
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

    // ✅ SECURITY FIX: Issue httpOnly session cookie for regular users too (not just admin)
    const sessionToken = createSessionToken(user);
    const cookieOpts = getSessionCookieOptions();

    const response = NextResponse.json({
      success: true,
      role: 'USER',
      username: user.username,
      name: user.name,
      redirectUrl: '/dashboard',
      message: `Welcome back, ${user.name}! Opening your User Dashboard...`
    });

    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (error) {
    console.error('[LOGIN ERROR]:', error);
    return NextResponse.json(
      { success: false, message: 'Server authentication error.' },
      { status: 500 }
    );
  }
}
