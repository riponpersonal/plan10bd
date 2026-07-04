// PLAN-10 BD — Input Validation & Sanitization Helpers
// Used by API route handlers to validate and sanitize incoming data.

/**
 * Strip HTML tags and dangerous script content from a string.
 * This is a server-side guard against stored XSS.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove on* event handlers (onerror, onclick, etc.)
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitize all string values in a plain object (one level deep).
 * @param {object} obj
 * @returns {object}
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else {
      clean[key] = value; // pass through non-string non-primitive (arrays, nested objects)
    }
  }
  return clean;
}

/**
 * Validate an SPL membership / product purchase application.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateApplication(body) {
  const errors = [];

  if (!body.applicantName || body.applicantName.trim().length < 2) {
    errors.push('Applicant name must be at least 2 characters.');
  }
  if (body.applicantName && body.applicantName.trim().length > 100) {
    errors.push('Applicant name must not exceed 100 characters.');
  }

  if (!body.phone || body.phone.replace(/\D/g, '').length < 10) {
    errors.push('A valid phone number (at least 10 digits) is required.');
  }
  if (body.phone && body.phone.length > 20) {
    errors.push('Phone number is too long.');
  }

  if (!body.nid || body.nid.replace(/\D/g, '').length < 10) {
    errors.push('NID number must be at least 10 digits.');
  }
  if (body.nid && body.nid.length > 20) {
    errors.push('NID number is too long.');
  }

  if (!body.password || body.password.trim().length < 4) {
    errors.push('Password must be at least 4 characters.');
  }

  // Investment-specific validation
  if (body.purpose !== 'Buy Product') {
    if (body.capitalAmount !== undefined && body.capitalAmount !== null) {
      const amount = Number(body.capitalAmount);
      if (isNaN(amount) || amount < 10000) {
        errors.push('Minimum investment amount is ৳10,000.');
      }
      if (amount > 10000000) {
        errors.push('Maximum investment amount is ৳1,00,00,000.');
      }
    }
    if (body.durationMonths !== undefined) {
      const validDurations = [12, 24, 33, 36];
      if (!validDurations.includes(Number(body.durationMonths))) {
        errors.push('Investment duration must be 12, 24, 33, or 36 months.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate an inquiry form submission.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInquiry(body) {
  const errors = [];

  if (!body.name || body.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters.');
  }
  if (!body.phone || body.phone.replace(/\D/g, '').length < 10) {
    errors.push('A valid phone number is required.');
  }
  if (!body.message || body.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters.');
  }
  if (body.message && body.message.length > 2000) {
    errors.push('Message must not exceed 2,000 characters.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a product creation / update payload.
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProduct(body) {
  const errors = [];
  const VALID_STOCK_STATUSES = ['IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER'];

  if (!body.name || body.name.trim().length < 1) {
    errors.push('Product name is required.');
  }
  if (body.name && body.name.length > 200) {
    errors.push('Product name must not exceed 200 characters.');
  }

  const price = Number(body.price);
  if (isNaN(price) || price < 0) {
    errors.push('Price must be a non-negative number.');
  }
  if (price > 10000000) {
    errors.push('Price seems unreasonably high. Please verify.');
  }

  if (body.stockStatus && !VALID_STOCK_STATUSES.includes(body.stockStatus)) {
    errors.push(`Stock status must be one of: ${VALID_STOCK_STATUSES.join(', ')}.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate login credentials (basic — auth is handled by findUserByCredentials).
 * @param {object} body
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLoginInput(body) {
  const errors = [];

  if (!body.username || body.username.trim().length < 1) {
    errors.push('Username or phone number is required.');
  }
  if (body.username && body.username.length > 100) {
    errors.push('Username is too long.');
  }
  if (!body.password || body.password.length < 1) {
    errors.push('Password is required.');
  }
  if (body.password && body.password.length > 200) {
    errors.push('Password is too long.');
  }

  return { valid: errors.length === 0, errors };
}
