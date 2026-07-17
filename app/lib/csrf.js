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

export function validateOrigin(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  if (!host) return false;

  const getDomain = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return url.host; // Returns hostname:port (e.g. "localhost:3000" or "newplan10bdpvtltd.com")
    } catch {
      return null;
    }
  };

  // Check Origin header first (most reliable)
  if (origin) {
    const originDomain = getDomain(origin);
    return originDomain === host;
  }

  // Fall back to Referer header
  if (referer) {
    const refererDomain = getDomain(referer);
    return refererDomain === host;
  }

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

