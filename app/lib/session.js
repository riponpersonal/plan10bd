// PLAN-10 BD — Session Management (httpOnly Cookie-based)
// Uses HMAC-SHA256 to sign session tokens. Zero external dependencies.
// The secret key MUST be set via PLAN10_SECRET_KEY environment variable in production.

import crypto from 'crypto';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'plan10_session';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

function getSecretKey() {
  const key = process.env.PLAN10_SECRET_KEY;
  if (!key || key.length < 16) {
    throw new Error(
      '[FATAL] PLAN10_SECRET_KEY environment variable is NOT set or is too short. ' +
      'The application will refuse to start. Generate a strong random key (e.g. "openssl rand -hex 32") and set it in your .env or production environment.'
    );
  }
  return key;
}

/**
 * Create a signed session token for a user.
 * Format: "base64(payload).signature"
 * @param {{ id: string, username: string, name: string, role: string, phone?: string }} user
 * @returns {string} signed token
 */
export function createSessionToken(user) {
  const secretKey = getSecretKey();
  const payload = {
    id: user.id || user.username,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone || null,
    publicId: user.publicId || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', secretKey)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${sig}`;
}

/**
 * Verify and decode a session token.
 * @param {string} token
 * @returns {{ valid: boolean, payload: object|null, expired: boolean }}
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, payload: null, expired: false };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, payload: null, expired: false };
  }

  const [payloadB64, sig] = parts;

  // Verify signature
  const secretKey = getSecretKey();
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(payloadB64)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedSigBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return { valid: false, payload: null, expired: false };
    }
  } catch {
    return { valid: false, payload: null, expired: false };
  }

  // Decode payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, payload: null, expired: false };
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return { valid: false, payload, expired: true };
  }

  return { valid: true, payload, expired: false };
}

/**
 * Returns the cookie name used for the session.
 */
export function getSessionCookieName() {
  return COOKIE_NAME;
}

/**
 * Returns the cookie options for Set-Cookie headers.
 * @param {boolean} clear — if true, sets maxAge=0 to delete the cookie
 * @returns {object}
 */
export function getSessionCookieOptions(clear = false) {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
    maxAge: clear ? 0 : SESSION_MAX_AGE,
  };
}

// ─── Reusable Auth Helpers for API Routes ───

/**
 * Extract and verify the session payload from a request's cookies.
 * @param {Request} request
 * @returns {object|null} session payload or null if invalid/missing
 */
export function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const { valid, payload } = verifySessionToken(token);
  return valid ? payload : null;
}

/**
 * Check if the request has a valid ADMIN session.
 * ⛔ Does NOT fall back to x-admin-role header — that was a security hole.
 * @param {Request} request
 * @returns {boolean}
 */
export function requireAdmin(request) {
  const session = getSessionFromRequest(request);
  return !!(session && session.role === 'ADMIN');
}

/**
 * Check if the request has any valid authenticated session.
 * @param {Request} request
 * @returns {boolean}
 */
export function requireAuth(request) {
  const session = getSessionFromRequest(request);
  return !!session;
}

export { COOKIE_NAME, SESSION_MAX_AGE };

