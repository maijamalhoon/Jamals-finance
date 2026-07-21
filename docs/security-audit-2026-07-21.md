# Jamal's Finance Security Audit

**Audit date:** 21 July 2026  
**Scope:** Next.js frontend and server routes, Supabase Auth/Postgres/Storage/RPC, user-data authorization, GitHub repository and Actions, Vercel build/deployment configuration, browser caching, service worker, exports, logging, and third-party integrations.

## Executive summary

The application already had a sound base: user-owned tables had Row Level Security enabled, primary application queries used authenticated Supabase clients, protected pages validated sessions, soft-delete RPCs checked ownership, CSV exports neutralized spreadsheet formulas, Sentry removed sensitive request/user fields, and the service worker did not cache authenticated dashboard or private API responses.

The audit identified several defense-in-depth and deployment weaknesses. The most important were broad table/function grants, privileged RPC implementations exposed in the API schema, ownership relationships enforced mainly by individual policies rather than composite database constraints, a public avatar bucket, broad Content Security Policy source wildcards, missing distributed limits for expensive authenticated AI routes, mutable GitHub Action references, and a broken production build caused by an unused legacy settings implementation.

No existing user finance record was edited or deleted. Before adding relationship constraints, production data was checked for cross-user foreign-key mismatches and invalid core financial values; all tested mismatch/invalid counts were zero.

This work reduces known risk substantially but does not make the system “unhackable.” Security remains an ongoing operational process.

## Production Supabase changes applied

### Strict user ownership

- Replaced broad `ALL` ownership policies on accounts, categories, transactions, investments, and goals with explicit authenticated `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
- Every policy compares `auth.uid()` with the record owner.
- Added a database trigger that prevents authenticated clients from inserting a different `user_id` or changing an existing record owner.
- Revoked anonymous access to private/user-owned tables.
- Replaced broad authenticated table privileges with an explicit operation allowlist.
- Kept the public crypto asset catalogue read-only for anonymous users.

### Cross-record ownership integrity

Composite `(id, user_id)` constraints now prevent a malicious request from linking User A records to User B records, including:

- transfer source/destination accounts;
- transaction accounts, investments, refunds, and goal contributions;
- goal and contribution accounts;
- contribution-to-goal ownership;
- payable accounts and payment transactions;
- investment-withdrawal source/destination accounts, source/P&L transactions, and transfer records.

These controls operate below the frontend and remain effective against modified URLs, request bodies, local storage, browser developer tools, or direct API calls.

### Financial integrity

- Enforced positive transaction amounts.
- Enforced positive goal targets and non-negative goal progress.
- Enforced positive investment quantity and purchase price.
- Existing atomic financial RPCs continue to use database transactions and row locks where required.

### RPC/function privileges

- Removed an unused email-existence function that could become an account-enumeration primitive.
- Removed anonymous function execution inherited from PostgreSQL's default `PUBLIC` grant.
- Removed direct authenticated execution from trigger-only functions.
- Moved eight privileged `SECURITY DEFINER` implementations into the non-exposed `private` schema.
- Kept the public RPC signatures as `SECURITY INVOKER` wrappers so existing application behavior does not change.
- Fixed function search paths to reduce object-shadowing risk.

After remediation, the Supabase security advisor reports only the account-level leaked-password-protection setting as outstanding; no exposed privileged RPC warning remains.

### API abuse control

- Added a private per-user rate-limit table.
- Added an authenticated, atomic database rate-limit function.
- No request bodies, prompts, finance descriptions, or personal records are stored by the limiter; only user ID, scope, count, and timestamps are retained.

## Application and browser hardening staged

### Protected APIs

Authenticated AI routes now receive centralized checks for:

- supported state-changing methods;
- same-origin browser requests;
- cross-site fetch rejection;
- JSON content type;
- 64 KiB request-size limit;
- per-user database-backed request limits;
- generic, non-sensitive failure responses;
- `no-store` response handling.

### Private response caching

Dashboard pages, authenticated APIs, onboarding, and password-recovery responses receive browser/CDN no-store headers. The service worker already bypasses dashboard, auth, and private API data.

### Content Security Policy and headers

- Removed unrestricted external script loading.
- Removed production `unsafe-eval` while retaining it only for local development tooling.
- Restricted browser connections to the configured Supabase origin and Sentry ingestion.
- Disabled framing and object embedding.
- Kept HSTS, nosniff, referrer, opener/resource, and permissions policies.
- Added explicit private cache controls for sensitive routes.

`unsafe-inline` remains temporarily for Next.js inline runtime/bootstrap behavior. Migrating to nonce-based CSP is a future hardening option, but it changes rendering/cache characteristics and must be performance-tested before production use.

### Private avatars

The staged application maps avatar URLs to an authenticated same-origin endpoint. The endpoint:

- verifies the current session;
- accepts only the authenticated user's UUID folder;
- accepts only `profile.jpg`, `profile.jpeg`, `profile.png`, or `profile.webp`;
- rejects traversal and malformed paths;
- downloads through Supabase Storage RLS;
- enforces the 3 MiB limit and safe image content types;
- returns no-store, same-origin, nosniff responses.

The storage cutover migration changes the avatar bucket from public to private and migrates the single existing legacy public avatar metadata URL without changing the image bytes. It must be applied only after the new application deployment is confirmed healthy.

## GitHub and CI/CD hardening

- Pinned checkout and setup-node Actions to verified immutable commit SHAs.
- Disabled persisted checkout credentials.
- Corrected the invalid/non-current setup-node major reference.
- Pinned CI to Node 24 to match Vercel instead of allowing silent future major upgrades.
- Added a critical production dependency audit.
- Added CodeQL JavaScript/TypeScript security-extended analysis.
- Added dependency review for pull requests.
- Retained minimum workflow permissions and concurrency cancellation.
- Added a transactional User A/User B RLS regression test for local/non-production Supabase environments.
- Expanded the repository security policy and incident-response checklist.

## Verified secure behavior and existing protections

- RLS is enabled on all private public-schema tables.
- No public-schema table containing user finance data is anonymously readable after the grant hardening.
- No table is currently published to Supabase Realtime, so private records cannot be subscribed to through Realtime channels.
- Existing relationship mismatch checks returned zero.
- Existing invalid transaction/goal/investment value checks returned zero.
- No service-role key or database password was found in the current source search.
- Browser storage is used for preferences/currency/setup state, not custom password storage or service credentials.
- Passwords are delegated to Supabase Auth rather than stored by the application.
- Auth redirects are sanitized to internal paths.
- Password recovery uses the provider's PKCE/code flow.
- CSV exports neutralize cells beginning with spreadsheet formula characters.
- Sentry is configured without default PII and strips cookies, headers, query strings, request bodies, user objects, and sensitive-key patterns.
- The service worker does not cache authenticated finance pages or private API responses.
- No application admin feature based on editable frontend metadata or email checks was found.

## Remaining operational actions

These controls require provider-dashboard authority or operational evidence that was not available through the connected write tools:

1. **Supabase Auth:** enable leaked-password protection, configure the strongest supported password policy, CAPTCHA/bot protection, and review Auth rate-limit values.
2. **Supabase backups:** verify encrypted backup retention and perform a documented restore drill on a non-production project.
3. **GitHub repository settings:** enable secret scanning/push protection, Dependabot alerts, private vulnerability reporting, and branch protection/rulesets that require CI/security checks for production changes.
4. **Vercel access:** review project/team membership, protect previews, restrict deployment hooks, and confirm only trusted branches can reach production.
5. **Environment variables:** review names and environment scopes in Vercel/Supabase; rotate any secret that has ever appeared in a commit, log, screenshot, build artifact, or client bundle. Secret values were intentionally not retrieved or printed during this audit.
6. **Monitoring:** create alerts for repeated authorization failures, auth abuse, unusual exports, rate-limit denials, and storage-policy failures without logging private payloads.
7. **Restore and incident exercises:** periodically test session revocation, key rotation, rollback, backup restore, and evidence preservation.
8. **Avatar cutover:** apply the private-avatar migration only after the deployment containing the authenticated avatar endpoint passes validation.
9. **CSP nonce evaluation:** evaluate nonce-based CSP in a staging environment before removing the remaining inline-script allowance.

## Change-safety statement

The security work intentionally did not redesign pages, alter colors/icons/layouts/animations, change normal finance calculations, or delete user records. The only metadata migration prepared for existing data replaces a permanent public avatar URL with an authenticated internal URL while preserving the image itself.
