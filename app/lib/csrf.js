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

  const isAllowed = (urlStr) => {
    if (!urlStr) return false;
    try {
      const url = new URL(urlStr);
      const domain = url.host.toLowerCase();
      const hostClean = host.toLowerCase();

      // Check same-origin (direct match with Host header)
      if (domain === hostClean) return true;

      // Fall back to whitelisted ALLOWED_ORIGINS
      return ALLOWED_ORIGINS.some((allowed) => {
        try {
          const allowedHost = new URL(allowed).host.toLowerCase();
          return domain === allowedHost;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  };

  // Check Origin header first (most reliable)
  if (origin) {
    return isAllowed(origin);
  }

  // Fall back to Referer header
  if (referer) {
    return isAllowed(referer);
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

