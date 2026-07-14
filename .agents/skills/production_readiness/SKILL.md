---
name: production_readiness_audit
description: Guide and checklists for evaluating Next.js applications for security, database scaling, and high-traffic production readiness.
---

# Production Readiness & Security Audit Guide

This skill provides guidelines, best practices, and audit checklists to ensure the Next.js application is secure, scalable, and ready to serve high volumes of traffic.

## 1. Authentication & Authorization Audits
When reviewing endpoints, always verify that security checks are enforced on the server:
- **Cookie-Based Sessions:** Ensure session identifiers are transmitted via secure, server-signed `httpOnly` cookies rather than local storage to prevent XSS-based session hijacking.
- **Role Enforcement:** Verify that role-based permissions (e.g., `ADMIN`, `USER`) are validated using cryptographically signed session tokens rather than easily spoofed client-side HTTP headers.
- **Middleware Gates:** Check if authorization is enforced at a central middleware level (`middleware.js`) to prevent routes from being accidentally left exposed.

## 2. Input Validation & Data Handling
Defend the application boundaries against invalid or malicious data:
- **Server-Side Validation:** Check that all mutable endpoints (POST, PUT, PATCH) validate types, constraints, and string lengths before updating backend data.
- **Sanitization:** Ensure user inputs destined for databases or HTML rendering are sanitized of malicious scripts or dangerous injection patterns.
- **Error Handling:** Check that server-side errors returned to users do not leak stack traces, internal paths, or private configuration details.

## 3. Database Migration Checklist
To transition from local flat-file databases (like `.json` files) to production databases:
- **Relational Databases (SQL):** Transition to PostgreSQL or MySQL using an ORM like Prisma or Drizzle for type safety.
- **Concurrency & Transactions:** Utilize database transactions to handle concurrent user operations safely without data corruption.
- **Connection Pools:** Configure connection pooling to reuse database connections under heavy load.

## 4. CSRF & Rate Limiting Guidelines
Mitigate cross-site attacks and brute-force traffic:
- **Same-Site Enforcement:** Ensure that state-changing requests validate `Origin` and `Referer` headers against a whitelist of trusted domains.
- **Centralized Rate Limiting:** In distributed environments, run rate limiting through a cache layer like Redis rather than local in-memory stores.
