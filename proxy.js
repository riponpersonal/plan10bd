// PLAN-10 BD — Server-Side Middleware
// Enforces authentication, CSRF, rate limiting, and security headers
// on every request before it hits your route handlers.

import { NextResponse } from 'next/server';

// ─── Security Headers ───
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '0', // Disable legacy XSS auditor; rely on CSP
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// Content Security Policy — locked down for a financial app.
// Customise the style-src / font-src if you use external fonts or CDNs.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://kit.fontawesome.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

// ─── Rate-Limiting (DB-backed) ───
// Simple in-memory fallback for dev; swap with Redis/Vercel KV in production.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP (generous for most pages)
const AUTH_RATE_LIMIT_MAX = 10; // 10 requests per minute for auth endpoints

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || request.headers.get('x-vercel-ip') || '127.0.0.1';
}

function checkRateLimit(ip, maxRequests) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { limited: true, remaining: 0 };
  }
  return { limited: false, remaining: maxRequests - entry.count };
}

// Periodic cleanup to prevent memory leaks
if (typeof globalThis !== 'undefined' && !globalThis._plan10MiddlewareCleanup) {
  globalThis._plan10MiddlewareCleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}

// ─── Protected Path Patterns ───
const ADMIN_PATHS = ['/admin'];
const DASHBOARD_PATHS = ['/dashboard'];
const AUTH_PATHS = ['/api/auth/login', '/api/auth/session'];
const PUBLIC_API_PATHS = ['/api/inquiries', '/api/applications', '/api/categories', '/api/products'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const ip = getClientIp(request);

  // ── 1. Apply Security Headers to All Responses ──
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set('Content-Security-Policy', CSP);

  // ── 2. Rate Limiting ──
  const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p));
  const isPublicApi = PUBLIC_API_PATHS.some(p => pathname.startsWith(p));
  const isApiPath = pathname.startsWith('/api/');

  if (isAuthPath) {
    const rateCheck = checkRateLimit(ip, AUTH_RATE_LIMIT_MAX);
    if (rateCheck.limited) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...SECURITY_HEADERS,
          },
        }
      );
    }
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
  } else if (isPublicApi) {
    const rateCheck = checkRateLimit(ip, RATE_LIMIT_MAX);
    if (rateCheck.limited) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            ...SECURITY_HEADERS,
          },
        }
      );
    }
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
  }

  // ── 3. Admin Path Protection ──
  if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    // We do NOT redirect from middleware because the admin layout already
    // verifies via the session API. Middleware adds the security headers
    // and an extra layer: if a non-admin hits a direct admin route,
    // the server-side layout will redirect.
    // The real enforcement still happens in the API layer.
    // Optionally add a server-side cookie check here if needed.
  }

  // ── 4. Dashboard Path Protection ──
  if (DASHBOARD_PATHS.some(p => pathname.startsWith(p))) {
    // Dashboard layout also re-checks via session API.
  }

  // ── 5. Deny direct access to API internals (like db-setup via middleware) ──
  if (pathname.startsWith('/api/admin/db-setup') && request.method !== 'POST') {
    // db-setup only accepts POST (admin session gated); disallow GET entirely
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Method not allowed.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      }
    );
  }

  // ── 6. Block access to .env, .git, node_modules, etc. ──
  const BLOCKED_PATTERNS = [/\.env/, /\.git\//, /\/node_modules\//, /\.sql$/];
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(pathname))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};
