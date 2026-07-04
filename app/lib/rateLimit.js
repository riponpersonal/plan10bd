// PLAN-10 BD — In-Memory Rate Limiter
// Applies to the login endpoint to prevent brute-force attacks.
// State is stored in-process (resets on server restart — acceptable for a flat-file app).

// Map<ip, { count: number, firstAttempt: number, lastAttempt: number }>
const attempts = new Map();

const MAX_ATTEMPTS = 5;       // Max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000;  // 15-minute sliding window
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // Clean up stale entries every 30 min

// Periodically clear expired entries to prevent memory leaks
if (typeof globalThis !== 'undefined' && !globalThis._plan10RateLimitCleanup) {
  globalThis._plan10RateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of attempts.entries()) {
      if (now - data.firstAttempt > WINDOW_MS) {
        attempts.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Extract the real client IP from a Next.js Request object.
 * Handles reverse proxies via x-forwarded-for.
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Check if an IP is currently rate-limited.
 * Call this BEFORE processing the login attempt.
 * @param {string} ip
 * @returns {{ limited: boolean, retryAfterMs: number, attemptsLeft: number }}
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry) {
    return { limited: false, retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS };
  }

  // Window has expired — reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return { limited: false, retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - entry.firstAttempt);
    return { limited: true, retryAfterMs, attemptsLeft: 0 };
  }

  return { limited: false, retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS - entry.count };
}

/**
 * Record a failed login attempt for the given IP.
 * @param {string} ip
 */
export function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
  } else {
    entry.count += 1;
    entry.lastAttempt = now;
  }
}

/**
 * Clear the rate limit record for an IP after a successful login.
 * @param {string} ip
 */
export function clearRateLimit(ip) {
  attempts.delete(ip);
}
