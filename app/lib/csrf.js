// PLAN-10 BD — CSRF Protection via Origin Validation
// Validates that mutating requests (POST/PATCH/PUT/DELETE) come from the app itself.
// This is the standard approach for same-origin enforcement without CSRF tokens.

// Allowed origins — matches next.config.mjs allowedDevOrigins + production domain
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.56.1:3000',
  'http://192.168.56.1',
];

// ✅ Add production domain from environment variable
if (process.env.PLAN10_PRODUCTION_ORIGIN) {
  ALLOWED_ORIGINS.push(process.env.PLAN10_PRODUCTION_ORIGIN);
}

/**
 * Validate the Origin or Referer header of a mutating request.
 * Returns true if the request appears to be same-origin.
 * ⛔ SECURITY FIX: Returns false when neither header is present (prevents CSRF bypass).
 * @param {Request} request
 * @returns {boolean}
 */
export function validateOrigin(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Check Origin header first (most reliable)
  if (origin) {
    return ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed));
  }

  // Fall back to Referer header
  if (referer) {
    return ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed));
  }

  // ⛔ SECURITY FIX: If neither header is present, DENY the request.
  // Previously this returned true, allowing CSRF bypass by stripping headers.
  return false;
}

/**
 * Returns a 403 JSON response for CSRF violations.
 * @param {string} [message]
 * @returns {Response}
 */
export function csrfDenied(message = 'Forbidden: Cross-origin request rejected.') {
  return new Response(
    JSON.stringify({ success: false, message }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

