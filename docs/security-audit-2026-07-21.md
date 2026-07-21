# Jamal's Finance Security Audit

**Audit date:** 21 July 2026  
**Scope:** Next.js frontend/server routes, Supabase Auth/Postgres/Storage/RPC, authorization boundaries, GitHub Actions, Vercel deployment behavior, caching, exports, logs, service worker, and third-party integrations.

## Executive summary

The application already had a useful security base: private tables used Row Level Security, authenticated pages refreshed and validated Supabase sessions, financial deletion/withdrawal operations used database RPCs, CSV exports neutralized spreadsheet formulas, Sentry removed sensitive request/user fields, and the service worker avoided authenticated dashboard/API caching.

The audit found defense-in-depth gaps in table/function grants, record ownership relationships, exposed privileged RPC implementations, avatar storage, Content Security Policy, expensive API abuse controls, CI action pinning, and production build reliability. These areas were hardened without intentionally changing UI/UX, layouts, icons, colors, animations, normal finance behavior, or user records.

No system can be guaranteed unhackable. The controls below substantially reduce known confidentiality, authorization, integrity, replay/abuse, and supply-chain risks while leaving ongoing operational work clearly identified.

## Production Supabase hardening applied

### Strict data isolation

- Replaced broad ownership policies on core finance tables with explicit authenticated `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
- Every private operation validates `auth.uid()` against the record owner.
- Added database triggers that reject forged or changed `user_id` values.
- Revoked anonymous access to private/user-owned tables.
- Replaced broad authenticated grants with an explicit operation allowlist.
- Kept the public crypto catalogue read-only.

### Cross-record ownership integrity

Composite `(id, user_id)` foreign keys now prevent User A records from referencing User B records across accounts, transfers, transactions, investments, refunds, goals, contributions, payables, payments, and investment withdrawals. These checks operate below the frontend and remain effective against edited URLs, payloads, local storage, browser tools, or direct API calls.

Before constraints were validated, production mismatch checks returned zero for every tested relationship. Existing invalid core transaction/goal/investment amount checks also returned zero.

### Financial integrity and concurrency

- Transaction amounts must be positive.
- Goal targets must be positive and progress cannot be negative.
- Investment quantity and purchase price must be positive.
- Existing atomic RPC transaction/locking behavior remains intact.
- A private atomic per-user API limiter was added for expensive authenticated requests.

### RPC/function privileges

- Removed an unused email-existence helper that could support account enumeration.
- Removed default anonymous function execution inherited through PostgreSQL `PUBLIC` grants.
- Removed direct execution from trigger-only functions.
- Moved eight privileged `SECURITY DEFINER` implementations to the non-exposed `private` schema.
- Preserved existing public RPC signatures through `SECURITY INVOKER` wrappers.
- Fixed function search paths and applied explicit execution grants.

After remediation, the Supabase security advisor no longer reports exposed privileged RPCs. The remaining advisor item is the account-level leaked-password-protection setting.

## Application hardening

### Authenticated APIs

Central middleware now applies to protected AI routes:

- verified authenticated sessions;
- same-origin `Origin` and fetch-site checks;
- JSON-only state-changing requests;
- 64 KiB request limit;
- per-user database-backed rate limits;
- generic non-sensitive errors;
- private no-store responses.

The rate limiter stores only user ID, scope, count, and timestamps. It does not store prompts, request bodies, finance descriptions, or private records.

### Browser and response protection

- Dashboard pages, private APIs, onboarding, and password recovery use browser/CDN no-store headers.
- CSP no longer allows unrestricted external scripts or production `unsafe-eval`.
- Browser connections are limited to the configured Supabase endpoint and required Sentry ingestion.
- Framing and object embedding are disabled.
- HSTS, nosniff, referrer, opener/resource, and permissions policies remain enabled.
- `unsafe-inline` remains temporarily for Next.js runtime/bootstrap compatibility; nonce-based CSP should be evaluated in staging before removal.

### Private avatars

The application now provides an authenticated same-origin avatar endpoint that validates the current user, UUID folder ownership, allowed image names/types, path traversal, size, and private no-store delivery.

The prepared storage migration:

- preserves existing image bytes;
- converts permanent public metadata URLs to internal authenticated URLs;
- changes the avatar bucket to private;
- enforces owner-only read/upload/update/delete policies;
- limits files to JPEG, PNG, or WebP and 3 MiB.

This cutover must only be applied after the deployment containing the authenticated route is confirmed healthy.

## GitHub and CI/CD hardening

- Pinned third-party Actions to immutable verified commit SHAs.
- Disabled persisted checkout credentials.
- Standardized CI/Vercel runtime on Node 24.
- Added blocking critical production dependency audit.
- Added blocking typecheck, production build, and focused security-contract tests.
- Added CodeQL JavaScript/TypeScript security-extended scanning.
- Added dependency review in advisory mode until the repository dependency graph is enabled.
- Added a transactional User A/User B RLS regression test for disposable non-production databases.
- Expanded the security reporting and incident-response policy.

The pre-existing full lint/test suite still contains unrelated UI-hook/source-string/alias failures. Those results remain visible as diagnostic artifacts rather than being hidden or weakened. Security contracts, typecheck, dependency audit, and production build remain blocking.

## Existing protections verified

- RLS is enabled on private public-schema tables.
- No private finance table is published to Supabase Realtime.
- No service-role key or database password was found in current application source searches.
- Password storage is delegated to Supabase Auth; the application does not implement custom password storage.
- Auth redirects are constrained to internal paths and recovery uses the provider PKCE/code flow.
- CSV exports neutralize spreadsheet formula prefixes.
- Sentry disables default PII and strips cookies, headers, query strings, request bodies, user objects, and sensitive-key patterns.
- The service worker does not cache authenticated finance pages or private API responses.
- Browser storage is used for preferences/currency/setup state, not service credentials or custom passwords.
- No admin authorization based on editable frontend metadata, local storage, or email matching was found.

## Remaining provider/operational actions

1. Enable Supabase leaked-password protection, review password policy/Auth limits, and configure CAPTCHA/bot protection.
2. Verify encrypted backup retention and perform a documented restore drill on a non-production project.
3. Enable GitHub dependency graph, secret scanning/push protection, private vulnerability reporting, and branch/ruleset protections requiring CI/security checks.
4. Review Vercel project membership, preview protection, deployment hooks, trusted production branches, and environment-variable scopes.
5. Rotate any secret that has ever appeared in a commit, log, screenshot, artifact, or client bundle. Secret values were intentionally not retrieved or printed during this audit.
6. Add privacy-conscious alerts for repeated authorization failures, auth abuse, unusual exports, limiter denials, and storage-policy failures.
7. Periodically test session revocation, credential rotation, rollback, backup restore, and evidence preservation.
8. Evaluate nonce-based CSP and public-edge/WAF rate controls in staging before production changes.

## Change-safety statement

Production finance records were not edited or deleted. The prepared avatar metadata migration changes only delivery metadata while preserving image bytes. No intentional visible redesign or change to normal calculations, layout, animation, iconography, color, or user workflow is included.
