// PLAN-10 BD — Session Management (httpOnly Cookie-based)
// Uses HMAC-SHA256 to sign session tokens. Zero external dependencies.
// The secret key should be set via PLAN10_SECRET_KEY environment variable in production.

import crypto from 'crypto';

// ⚠️ Set PLAN10_SECRET_KEY as an environment variable in production!
const SECRET_KEY = process.env.PLAN10_SECRET_KEY || 'plan10-bd-default-secret-change-in-production-2026';
const COOKIE_NAME = 'plan10_session';
const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours in seconds

/**
 * Create a signed session token for a user.
 * Format: "base64(payload).signature"
 * @param {{ id: string, username: string, name: string, role: string }} user
 * @returns {string} signed token
 */
export function createSessionToken(user) {
  const payload = {
    id: user.id || user.username,
    username: user.username,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SECRET_KEY)
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
  const expectedSig = crypto
    .createHmac('sha256', SECRET_KEY)
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
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: clear ? 0 : SESSION_MAX_AGE,
  };
}

export { COOKIE_NAME, SESSION_MAX_AGE };
