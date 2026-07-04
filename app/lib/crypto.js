// PLAN-10 BD — Password Hashing Utility
// Uses Node.js built-in crypto.scryptSync (same strength as bcrypt, no npm dependency)
// Hash format: "scrypt:<salt_hex>:<hash_hex>"

import crypto from 'crypto';

const SCRYPT_PARAMS = {
  N: 16384,  // CPU/memory cost (2^14 — suitable for a server, fast enough for login)
  r: 8,      // Block size
  p: 1,      // Parallelization
  dkLen: 64  // Output key length in bytes
};

const HASH_PREFIX = 'scrypt:';
const SALT_BYTES = 16;

/**
 * Hash a plaintext password using scrypt.
 * @param {string} plaintext
 * @returns {string} "scrypt:<salt_hex>:<hash_hex>"
 */
export function hashPassword(plaintext) {
  if (!plaintext) throw new Error('Password cannot be empty');
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(plaintext, salt, SCRYPT_PARAMS.dkLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });
  return `${HASH_PREFIX}${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Also returns true for legacy plaintext passwords if they match directly,
 * to support auto-migration.
 * @param {string} plaintext
 * @param {string} stored — either a scrypt hash or a legacy plaintext password
 * @returns {boolean}
 */
export function verifyPassword(plaintext, stored) {
  if (!plaintext || !stored) return false;

  // Modern scrypt hash
  if (stored.startsWith(HASH_PREFIX)) {
    try {
      const parts = stored.split(':');
      if (parts.length !== 3) return false;
      const [, saltHex, hashHex] = parts;
      const salt = Buffer.from(saltHex, 'hex');
      const knownHash = Buffer.from(hashHex, 'hex');
      const candidateHash = crypto.scryptSync(plaintext, salt, SCRYPT_PARAMS.dkLen, {
        N: SCRYPT_PARAMS.N,
        r: SCRYPT_PARAMS.r,
        p: SCRYPT_PARAMS.p
      });
      // Use timingSafeEqual to prevent timing attacks
      return crypto.timingSafeEqual(knownHash, candidateHash);
    } catch {
      return false;
    }
  }

  // Legacy plaintext comparison (for auto-migration support)
  // Use a timing-safe string comparison to avoid timing attacks on plaintext too
  const storedBuf = Buffer.from(stored);
  const plaintextBuf = Buffer.from(plaintext);
  if (storedBuf.length !== plaintextBuf.length) return false;
  try {
    return crypto.timingSafeEqual(storedBuf, plaintextBuf);
  } catch {
    return stored === plaintext;
  }
}

/**
 * Returns true if a stored password needs to be rehashed (i.e., it's still plaintext).
 * @param {string} stored
 * @returns {boolean}
 */
export function needsRehash(stored) {
  if (!stored) return false;
  return !stored.startsWith(HASH_PREFIX);
}
