# Jamal's Finance — Complete Project Audit

**Audit date:** 18 July 2026  
**Repository:** `maijamalhoon/Jamals-finance`  
**Audited branch/commit:** `main` at `c609249085747f6a6fde764ada4b15073b3310b4`  
**Connected Vercel project:** `jamals-finance`  
**Production URL:** https://jamals-finance-sable.vercel.app  
**Audit type:** Non-destructive architecture, code, database, UI/UX, security, reliability, dependency, SEO, accessibility, and deployment review

> This audit changes documentation only. It does not remove or modify existing functionality, animations, business logic, migrations, environment values, financial records, authentication sessions, or user data.

---

## 1. Executive summary

Jamal's Finance is a substantial, actively developed personal-finance application built with Next.js 16, React 19, TypeScript, Supabase, PostgreSQL Row Level Security, Recharts, Framer Motion, Sentry, and Vercel. The product already includes a polished public landing experience, authentication and recovery flows, onboarding, accounts, income and expenses, transactions, transfers, goals, payables, investments, analytics, reports, notifications, settings, currency conversion, market-data integrations, and AI-assisted finance summaries.

The repository is stronger than a typical early-stage finance dashboard in several important areas:

- Financial failures are often represented as **partial or unavailable**, rather than silently converted to a misleading zero.
- Authentication redirects are carefully sanitized against open-redirect and encoded-path attacks.
- Supabase RLS policies are present for user-owned tables.
- Error boundaries and Sentry integration exist, with deliberate filtering of financial and identity data.
- Responsive design, reduced-motion behavior, mobile dialogs, loading states, empty states, and route-level error states have received significant attention.
- CI, tests, versioned migrations, repository governance, Dependabot configuration, and production deployment are already present.

The main risks are not visual polish. They are concentrated in **financial data integrity, runtime reliability, production configuration consistency, third-party API resilience, and maintainability**.

### Overall assessment

| Area | Assessment | Notes |
| --- | --- | --- |
| Architecture | Good | Clear feature boundaries and server-first App Router design, but several oversized route/components and duplicated generations remain. |
| UI/UX | Good to very good | Strong design system and truthful states; formal independent UX/accessibility testing is still needed. |
| Responsiveness | Good | Existing verification covers common viewport sizes; CSS layering is becoming difficult to maintain. |
| Performance | Needs improvement | Dashboard request fan-out, external market refreshes, global client providers, and fragmented CSS increase cost. |
| Security | Good foundation, important hardening needed | RLS and redirect handling are strong; CSP, runtime validation, MFA/CAPTCHA, preview-route exposure, and rate limiting need attention. |
| Authentication | Good | Thoughtful recovery and stale-session handling; operational errors remain visible in Vercel logs. |
| Database integrity | Needs priority work | Balance triggers and account-transfer ownership constraints require a careful non-destructive review. |
| Error handling | Good foundation | User-safe states and Sentry exist; external providers need timeouts, retry policy, and typed error contracts. |
| Code quality | Mixed-good | Strict TypeScript and tests exist, but broad lint exceptions, large files, duplicate UI generations, and likely unused packages add risk. |
| SEO | Good public foundation | Metadata, sitemap, robots, and OG images exist; hardcoded hostnames and accidental public preview routes should be fixed. |
| Accessibility | Good intent, not certified | Semantics, labels, focus states, touch targets, and reduced motion are visible; automated and manual WCAG coverage is incomplete. |
| Vercel deployment | Healthy but inconsistent | Current production build is successful; Node runtime differs from CI, and recent runtime errors show missing resilience. |

### Highest-priority findings

1. **Account transfers do not enforce same-user ownership through composite foreign keys.** A malformed record can reference an account owned by another user or an unavailable account; the balance trigger can then update only one side and leave an inconsistent transfer ledger.
2. **Account balances are mutable derived data maintained by historical triggers and corrective migrations.** A reconciliation mechanism and migration review are needed before future balance logic changes.
3. **Supabase runtime configuration is accessed with non-null assertions.** Vercel has recorded middleware failures when the project URL/key were unavailable in an environment.
4. **The AI route has observed invalid JSON and rate-limit failures.** It needs provider-supported structured output schemas, timeouts, per-user throttling, caching, and backoff.
5. **The Content Security Policy is too broad for a finance application.** `unsafe-inline`, `unsafe-eval`, broad `https:`/`wss:`, and unrestricted HTTPS frames reduce XSS containment.
6. **`/login-step5-preview` is deployed as a public static production route.** Internal design-preview pages should not be exposed or indexed.
7. **CI tests Node 20 while Vercel runs Node 24, and `engines.node` is open-ended.** The deployment log warns that production will automatically move across future Node majors.
8. **The dashboard performs approximately thirteen Supabase reads plus optional market refresh work for one request.** It should move toward purpose-built read models/RPCs while preserving current financial semantics.
9. **External finance providers lack consistent timeout, retry, quota, stale-data, and circuit-breaker handling.** Alpha Vantage can receive up to ten parallel quote requests; CoinGecko is used without a stable authenticated Demo API contract.
10. **The source contains parallel settings implementations and many layered CSS patch files.** This raises regression risk and makes responsive behavior harder to reason about.

---

## 2. Audit scope, evidence, and limitations

### Reviewed

- Repository metadata, documentation, governance, CI, dependency manifest, TypeScript and ESLint configuration
- Entire top-level source structure and indexed source usage
- Public, authentication, onboarding, dashboard, finance, analytics, reports, settings, market-data, AI, monitoring, and PWA areas
- Supabase browser/server/proxy/session helpers and all committed database migrations
- Representative server pages, client components, financial-calculation paths, error boundaries, service worker, SEO files, and security headers
- Connected Vercel project settings available through the integration
- Current production deployment and build logs
- Recent Vercel runtime errors and deployment history
- Existing repository and requirements audit records
- Current official documentation for recommended platforms, APIs, and libraries

### Verified deployment facts

- Current production deployment is `READY`.
- Latest audited deployment was built from commit `c609249` on `main`.
- Vercel detected Next.js `16.2.9` and used Turbopack.
- Production build compiled successfully, completed TypeScript validation, generated 20 static pages, and finished in approximately 55 seconds.
- Vercel is configured for Node.js 24.x.
- The uploaded build cache was approximately 171.88 MB.
- A recent failed deployment was caused by a TypeScript mismatch in `SettingsExperience.tsx`; later commits restored successful deployment.

### Limitations

- The audit integration did not expose secret environment-variable values, and no secret values were requested or displayed. The report evaluates names, usage, deployment behavior, and runtime symptoms only.
- The Supabase project was not connected as an administrative data source. Current live schema state, policy state, advisor output, table sizes, query plans, and production data consistency could not be inspected directly; committed migrations and application queries were used as evidence.
- No private user credentials were used. Authenticated production flows were reviewed through source, existing verification records, and runtime logs rather than by reading real user data.
- A fresh local `npm ci`, `npm audit`, full test run, bundle analyzer, Lighthouse run, and browser automation suite were not executed in this environment. Current Vercel build success and the repository's 17 July validation record were reviewed. That record reports 287 passing tests; this audit does not claim to have independently rerun them.
- Static code search cannot prove that a dependency is unused through dynamic import, code generation, or an unindexed branch. Dependency removals should be performed only in a focused PR with lockfile regeneration, tests, and a production build.

---

## 3. Project overview and current feature list

Jamal's Finance is a private, authenticated personal-finance workspace with a public marketing page. It stores user-owned finance records in Supabase/PostgreSQL and presents deterministic summaries, charts, reports, goals, liabilities, market-priced investments, and optional AI explanations.

### Public experience

- Responsive landing page
- Product capabilities, workflow, preview, privacy, and CTA sections
- Search metadata, canonical URL, Open Graph image, Twitter image, robots, sitemap, manifest, and installable PWA shell
- Explicit labeling of illustrative/demo values
- Login and signup entry points

### Authentication and identity

- Email/password login
- Signup with full name metadata
- Email verification flow
- Password recovery and reset
- Optional Google OAuth behind an environment flag
- Safe internal redirect sanitization
- Auth callback code exchange
- Protected dashboard proxy/middleware
- Stale-session cookie cleanup
- Recovery-marker binding and expiry logic
- Session and security settings
- Sign-out controls

### Onboarding

- Resumable onboarding flow
- Profile setup
- Optional first account
- First-entry/module guidance
- Progress and skip/resume behavior

### Accounts and money movement

- Multiple account types, including Pakistani wallet/account types
- Account creation, editing, detail views, status, and balances
- Income and expense transactions
- Account-to-account transfers
- Transaction search, filters, details, editing, deletion, refunds, and receipt views
- Parent/child categories, colors, and icons
- Income source, person, item, and reference metadata

### Planning

- Savings goals
- Goal progress and contributions
- Payables/liabilities
- Liability payments, due dates, overdue/partial/completed states
- Persistent notifications for selected due items

### Investments and market data

- Investment holdings and acquisition details
- Current price, original currency, price source, updated timestamp, and 24-hour change fields
- International stock search and quotes through Alpha Vantage
- Cryptocurrency search and prices through CoinGecko
- USD/PKR conversion through ExchangeRate-API with a local fallback
- Truthful partial/unpriced states when market data is unavailable

### Dashboard and analytics

- Net savings, income, expenses, investment contributions, balances, and current-month comparisons
- Daily cash flow and spending breakdowns
- Investment overview and P&L context
- Goal progress
- Recent transactions and transfers
- New-user setup guidance
- Period-based analytics and comparisons
- Reports with CSV export and print support

### AI features

- Authenticated AI finance summary endpoint
- Finance health score and summary cards
- Four insight items and recommended actions
- Finance chat endpoint
- Deterministic local fallback insights when Gemini is unavailable or malformed
- Data minimization relative to raw-row prompting: the route builds a summarized finance object before calling the provider

### Preferences, resilience, and monitoring

- Light, dark, and system themes
- PKR/USD display conversion
- Date/currency preferences
- Notification preferences
- Connection/offline status
- Service worker and offline page
- Route loading, empty, partial, unavailable, and error states
- Sentry server/client integration with PII and financial-field scrubbing

### Known product gaps already identified in repository records

- Secure server-side account deletion with reauthentication and retention/export decisions
- More complete notification rule families
- Direct downloadable styled PDF receipts
- Explicit report-local offline/insufficient-data states
- Explicit locale and timezone settings
- Dedicated help/guide experience
- Formal accessibility certification and browser automation coverage

---

## 4. Technology stack

| Layer | Current technology | Audit notes |
| --- | --- | --- |
| Framework | Next.js 16.2.9, App Router | Modern server-first architecture; dynamic dashboard and API routes. |
| UI runtime | React 19.2.4 | Appropriate; several large client components should be split. |
| Language | TypeScript 5, strict mode | Strong baseline; broad lint suppressions weaken it. |
| Styling | Tailwind CSS 4 plus multiple global/route CSS files | Strong token system, but CSS patch layering is becoming technical debt. |
| Components | Base UI, Radix UI, shadcn packages, custom finance primitives | Accessible primitives are available; overlap should be reviewed. |
| Motion | Framer Motion plus custom IntersectionObserver/CSS animation | Reduced-motion support exists; duplicate `motion` package appears unnecessary unless dynamically used. |
| Icons | Lucide React | Consistent and appropriate. |
| Charts | Recharts | Suitable for current dashboards; retain unless requirements exceed it. |
| Forms/feedback | Custom controls, Flatpickr, Sonner | Good UX foundation; schema validation is mostly manual. |
| Backend | Supabase SSR/client, PostgreSQL | Correct fit for user-scoped finance data. |
| Auth | Supabase Auth | Email/password, recovery, optional Google OAuth. |
| Authorization | PostgreSQL RLS | Strong baseline; relationship ownership needs tighter database constraints. |
| Monitoring | Sentry Next.js | Good filtering; add release health and actionable alerts. |
| AI | Gemini REST API | Structured output implementation is incomplete and rate limits are visible. |
| Market data | Alpha Vantage, CoinGecko, ExchangeRate-API | Provider abstraction exists partially; resilience and licensing need improvement. |
| Testing | Vitest, TypeScript, ESLint, build | Good unit/static baseline; no committed end-to-end/a11y/performance suite was found. |
| CI/CD | GitHub Actions and Vercel Git integration | Healthy; Node versions must match. |
| PWA | Manifest, service worker, offline page | Conservative private-route bypass is good; cache hygiene can improve. |

---

## 5. Repository and folder structure

```text
.github/
  workflows/ci.yml              Lint, typecheck, tests, production build
  dependabot.yml                Automated dependency update configuration
  issue forms, PR template,
  CODEOWNERS                    Repository governance and ownership

docs/
  repository-audit-2026-07-17.md
                                Prior repository/governance audit

app/
  api/
    ai-insights/                Authenticated Gemini summary/chat route
    exchange-rate/              Public USD/PKR rate route
    market/                     Stock and crypto search/price handlers
  auth/callback/                Supabase OAuth/email callback exchange
  dashboard/
    accounts/                   Account list/details
    ai-insights/                AI UI
    analytics/                  Analytics UI and data loading
    expenses/                   Expense UI
    goals/                      Goal UI
    income/                     Income UI
    investments/                Investment UI
    payables/                   Liability/payable UI
    reports/                    Reports/export UI
    settings/                   Profile/preferences/security/categories
    transactions/               Transaction list/details
    layout.tsx                  Protected shell and notifications
    page.tsx                    Main dashboard composition
  login/                        Login/signup/recovery request
  login-step5-preview/          Internal-looking preview currently deployed
  onboarding/                   New-user onboarding
  reset-password/               Recovery completion
  layout.tsx                    Root metadata/providers/theme/PWA
  global-error.tsx              Global error boundary
  manifest.ts                   PWA manifest
  robots.ts                     Crawler policy
  sitemap.ts                    Public sitemap
  opengraph-image.tsx           Social image
  twitter-image.tsx             Twitter social image
  page.tsx                      Public landing page

components/
  accounts/                     Account cards/forms/modals/transfers
  ai-insights/                  AI summary and chat presentation
  analytics/                    Charts, controls, summaries
  auth/                         Shared auth controls/shell
  currency/                     Currency context/provider
  dashboard/                    Dashboard cards/charts/sections
  expenses/                     Expense flows
  goals/                        Goal cards/forms/animation
  income/                       Income flows
  investments/                  Holdings, pricing, charts/forms
  landing/                      Landing page and reveal effects
  layout/                       Header/navigation/notifications/actions
  loading/                      Skeletons and loading primitives
  motion/                       Motion provider/transitions/reveal utilities
  payables/                     Liability/payment flows
  reports/                      Report views/export/print
  settings/                     Multiple settings/category implementations
  transactions/                Transaction list/details/refunds/receipts
  ui/                           Shared controls, dialogs, finance modal, select

lib/
  analytics/                    Deterministic calculations and tests
  investments/                  Aggregation and market-price refresh
  market/                       Alpha Vantage and CoinGecko adapters
  settings/                     Security/settings helpers and tests
  supabase/                     Browser/server/proxy/session clients
  currency.ts                   PKR/USD formatting and fallback rate
  dates.ts                      App date semantics
  exchange-rate.ts              ExchangeRate-API integration
  notifications*.ts            Notification rules and persistence
  reports.ts                    Report calculations/export helpers
  transactions.ts              Sorting/normalization helpers
  dashboard-financial-semantics.ts
                                Truthful dashboard calculations
  ...                           CSV, transfers, liabilities, theme utilities

supabase/migrations/
  20260618070915_sync_account_balances_from_transactions.sql
  20260618071550_remove_duplicate_account_balance_trigger.sql
  20260619090000_add_payables_sources_and_search_metadata.sql
  20260619093000_fix_rls_and_index_advisors.sql
  20260619113000_add_account_transfers.sql

public/
  sw.js                         Service worker
  offline.html                  Offline fallback
  icons/readme/static assets

proxy.ts                        Global route/session boundary
next.config.ts                  Headers, CSP, image allowlist, Sentry wrapper
instrumentation*.ts             Sentry runtime setup
sentry.*.config.ts              Monitoring and data scrubbing
```

---

## 6. How the major components and data flows work

### 6.1 Public request flow

1. Vercel receives a request.
2. `proxy.ts` matches most application requests while excluding framework/static assets.
3. `lib/supabase/proxy.ts` classifies the route as public, auth-only, protected UI, public API, or protected API.
4. Public marketing routes continue without requiring a user.
5. Root layout applies metadata, theme bootstrap, motion provider, currency provider, PWA registration, and toast infrastructure.
6. The landing page is mostly server-rendered; `LandingScrollReveal` adds client-side reveal and scroll-progress effects.

### 6.2 Authentication flow

1. The login page creates a browser Supabase client.
2. Email/password, signup, password reset, and Google OAuth requests are initiated with Supabase Auth.
3. Redirect targets are passed through `sanitizeInternalRedirect`, which rejects control characters, backslashes, protocol-relative URLs, cross-origin URLs, and auth-loop paths.
4. `/auth/callback` exchanges an auth code for a session and applies private/no-store redirect headers.
5. Proxy middleware calls Supabase claims/user methods, classifies stale or transient failures, refreshes cookies, and redirects or returns API errors as appropriate.
6. Recovery flows use a short-lived session-bound marker before allowing password update behavior.

**Strength:** The redirect and recovery code is unusually careful for an application of this size.  
**Risk:** Middleware depends on valid environment configuration and an available Supabase network path for broad request coverage.

### 6.3 Protected dashboard flow

1. `app/dashboard/layout.tsx` is force-dynamic and loads notification state.
2. It renders the responsive header, connection status, scroll restoration, main scroll container, and floating actions.
3. `app/dashboard/page.tsx` performs multiple Supabase reads in parallel for period transactions, recent transactions, recent transfers, investments, goals, accounts, and setup counts.
4. Deterministic helpers sanitize rows and calculate cash flow, snapshots, balances, spending, investment contribution, and availability status.
5. Market pricing may be refreshed for investments.
6. Components render real, partial, unavailable, or empty states rather than replacing failed data with a fabricated success.

**Strength:** Financial semantics and failure-state modeling are good.  
**Risk:** Request fan-out and market refresh work can make the dashboard sensitive to Supabase/provider latency.

### 6.4 Transaction and account-balance flow

1. User transactions are stored in `public.transactions`.
2. A database trigger applies `income` as a positive balance delta and `expense` as a negative delta.
3. Updates reverse the old delta and apply the new delta; deletes reverse the original delta.
4. Account transfers are stored separately in `public.account_transfers` and treated as financially neutral in reporting.
5. A `SECURITY DEFINER` transfer trigger subtracts from the source account and adds to the destination account.

**Strength:** Transfer reporting is separated from income/expense semantics.  
**Risk:** The transfer table does not enforce `(account_id, user_id)` ownership through composite foreign keys, and the trigger does not verify that both updates affected exactly one row.

### 6.5 Liability/payment flow

1. Liabilities store original amount, paid amount, generated remaining amount, due date, status, and completion timestamp.
2. Liability payments reference a liability, user, optional account, and optional transaction.
3. RLS limits rows to the authenticated user.
4. A trigger recomputes paid totals and status after payment insert/update/delete.

**Strength:** Remaining amount is generated and payment ownership policies check the parent liability.  
**Opportunity:** Repeated aggregate subqueries inside the trigger can be simplified to one calculated total per execution.

### 6.6 Investment market-data flow

1. Investment records contain quantity, acquisition price, current price, provider metadata, and updated timestamps.
2. Alpha Vantage handles international stock symbol search and one `GLOBAL_QUOTE` request per symbol.
3. CoinGecko handles crypto search and batched simple-price lookup.
4. ExchangeRate-API supplies USD/PKR conversion; a fixed fallback of `281.2` is used when live data is unavailable.
5. Dashboard/investment helpers mark rows unpriced or partial where needed.

**Strength:** The UI does not label delayed Alpha Vantage data as live.  
**Risk:** Provider quotas, timeout behavior, and fallback age are not managed through one consistent reliability contract.

### 6.7 AI insight flow

1. The route authenticates the user.
2. It queries a bounded period of transactions and current planning/portfolio records.
3. It builds a summarized finance object rather than sending every raw transaction row.
4. It asks Gemini for JSON and manually parses/validates the result.
5. If configuration is absent, JSON is malformed, or Gemini fails, the route returns deterministic fallback insights or a safe API error.

**Strength:** Graceful fallback and summarized-data prompting.  
**Risk:** Production logs show malformed JSON and `429 RESOURCE_EXHAUSTED`; there is no provider schema, timeout, request budget, caching, or per-user throttle.

### 6.8 Monitoring flow

- Sentry is initialized for server and client runtimes.
- `sendDefaultPii` is disabled.
- User, request URL, cookies, headers, body, query string, extra fields, financial keys, email-like strings, and auth tokens are filtered before transmission.
- Global and dashboard errors expose retry behavior and user-safe copy.

This is a strong privacy-conscious monitoring implementation. It should be preserved.

---

## 7. Detailed findings

Severity definitions:

- **Critical:** Credible immediate path to broad data compromise or irreversible corruption.
- **High:** Important security, integrity, or availability risk that should be handled before major feature growth.
- **Medium:** Material reliability, performance, accessibility, or maintenance issue.
- **Low:** Cleanup or quality improvement with limited immediate production impact.

No confirmed critical breach was identified from the available evidence. The following high-priority risks should nevertheless be treated seriously because this is a financial-data application.

### A-01 — Account-transfer ownership is not enforced relationally

**Severity:** High  
**Area:** Database integrity / authorization

`account_transfers` references `accounts(id)` separately while storing an independent `user_id`. RLS checks only that the transfer row's `user_id` equals `auth.uid()`. The balance trigger updates an account only when both `id` and `user_id` match, but it does not raise an error when no account row is updated.

A malformed or deliberately constructed insert can therefore create a transfer row whose source or destination account is not owned by the user. The trigger can update one valid side and silently skip the invalid side, producing a one-sided balance movement and an inconsistent ledger.

**Recommended non-destructive fix:**

1. Back up and inventory existing mismatches; do not delete rows automatically.
2. Add/confirm `unique (id, user_id)` on `accounts`.
3. Add composite foreign keys:
   - `(from_account_id, user_id) -> accounts(id, user_id)`
   - `(to_account_id, user_id) -> accounts(id, user_id)`
4. Add them `NOT VALID`, repair identified rows with an explicit owner-approved mapping, then validate.
5. Update the trigger/function to verify both accounts exist, lock both rows in deterministic order, and raise on an unexpected row count.
6. Add database and application tests for cross-user IDs, archived accounts, concurrent transfers, updates, deletes, and retry/idempotency behavior.

### A-02 — Mutable account balances need a reconciliation invariant

**Severity:** High  
**Area:** Financial data integrity

Account balance is stored and mutated by triggers. The migration history shows:

- A transaction trigger was introduced.
- Existing transaction deltas were added to current account balances.
- A later migration corrected duplicate deltas for a time window and removed a duplicate trigger.
- Transfers later introduced another balance-mutating trigger.

This history does not prove current balances are wrong, but it shows that derived balance state can drift when triggers are duplicated, replayed, changed, or partially applied.

**Recommended fix:**

- Define the accounting invariant explicitly: `current balance = opening balance + income - expenses + inbound transfers - outbound transfers + approved adjustments`.
- Preserve an immutable opening balance or balance-adjustment ledger instead of treating `accounts.balance` as an unexplained mutable starting point.
- Add a read-only reconciliation SQL view/RPC that compares stored balance with ledger-derived balance.
- Run reconciliation in production and review differences before any mutation.
- Add a controlled repair migration only after backup, owner approval, and a per-account diff export.
- Prefer a transactional database function for transfer creation over allowing separate client insert logic plus a trigger when stronger atomic guarantees are required.

### A-03 — Runtime environment validation is missing

**Severity:** High  
**Area:** Availability / configuration security

Supabase clients use `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`. Non-null assertions suppress TypeScript warnings but do not validate production values.

Vercel runtime logs include historical middleware errors stating that the project URL and key were required. Because middleware/proxy covers broad routes, one environment mistake can affect most of the application.

**Recommended fix:**

- Create one server-safe environment module with schema validation.
- Validate required variables by runtime and feature:
  - Supabase URL/anon key: required for all authenticated routes.
  - Gemini key/model: required only when AI is enabled.
  - Alpha Vantage key: required only for stock features.
  - Exchange-rate key: optional with an explicit stale fallback state.
  - Sentry variables: optional.
  - Stripe variables: remove until feature exists, or validate when billing is enabled.
- Fail builds or initialization with a concise variable-name-only message; never log values.
- Maintain a production/preview/development environment matrix.
- Add a CI build case for required environment validation.

### A-04 — AI provider output and quota handling are not production-grade

**Severity:** High  
**Area:** Reliability / cost / privacy

Observed Vercel errors include invalid AI JSON and Gemini `429 RESOURCE_EXHAUSTED`. The route requests JSON MIME output but does not provide a provider-enforced JSON schema, and it has no explicit timeout, backoff, per-user rate limit, deduplication, or response cache.

**Recommended fix:**

- Use Gemini structured output with an explicit JSON schema.
- Validate the response with Zod (or equivalent) even when provider schema is enabled.
- Add an `AbortController` timeout.
- Retry only safe transient errors with capped exponential backoff and jitter; honor `Retry-After` where available.
- Do not retry malformed deterministic output indefinitely.
- Add per-user and per-IP budgets for GET generation and chat POST.
- Cache generated insights by user + finance-summary hash + currency + model for a defined TTL.
- Keep the current deterministic fallback.
- Expose a clear `generated`, `cached`, `fallback`, or `unavailable` source state.
- Add explicit user disclosure that summarized finance data is sent to Google when the AI feature is used, and provide a disable/consent preference.

### A-05 — CSP is materially too permissive

**Severity:** High  
**Area:** Web security

The global CSP permits:

- `script-src 'unsafe-inline' 'unsafe-eval' https:`
- `style-src 'unsafe-inline'`
- broad `connect-src https: wss:`
- broad `frame-src https:` and `child-src https:`
- broad media/image origins

The root layout contains an inline theme bootstrap, which explains one inline-script need, but it does not justify allowing all inline scripts, eval, all HTTPS scripts, or all HTTPS frames in production.

**Recommended fix:**

1. Inventory actual external origins used by Supabase, Sentry, Gemini (server-only), CoinGecko images, and any OAuth flow.
2. Deploy a stricter `Content-Security-Policy-Report-Only` first.
3. Remove `unsafe-eval` in production unless a verified library requires it.
4. Use a nonce/hash or Next.js-supported CSP approach for the theme bootstrap.
5. Replace `https:` and `wss:` wildcards with exact origins.
6. Remove frame/child sources unless a real embedded experience requires them.
7. Add `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and a precise `frame-ancestors` policy.
8. Keep preview/development allowances separate from production.

### A-06 — Internal preview route is public in production

**Severity:** High  
**Area:** Release hygiene / SEO / information exposure

The production build includes `/login-step5-preview` as a static route. Its name strongly indicates an internal design/iteration surface.

**Recommended fix:**

- Move previews to Storybook, a design-only route group excluded from production, or a separate protected preview deployment.
- At minimum, return `404` in production and add `noindex` while the route exists.
- Add a CI check that rejects route names matching `preview`, `demo`, `scratch`, or `test` unless explicitly allowlisted.

### A-07 — Node runtime and CI are inconsistent

**Severity:** High/Medium  
**Area:** Deployment reliability

- `package.json` declares `>=20.9.0`.
- GitHub Actions runs Node 20.
- Vercel runs Node 24.
- Vercel warns that the open-ended engine range will automatically upgrade across future major versions.

**Recommended fix:**

- Select one supported production major, preferably the current Vercel Node 24 setting after confirming all dependencies.
- Pin `engines.node` to `24.x` (or the chosen exact major range).
- Run CI on the same major.
- Optionally add a temporary Node 20/24 matrix during transition.
- Commit `.nvmrc` or `.node-version` and document it.

### A-08 — Dashboard data loading is query-heavy

**Severity:** Medium/High  
**Area:** Performance / availability

The dashboard issues roughly thirteen concurrent Supabase queries, including duplicate count queries, and then may refresh market prices. Parallelism reduces serial latency but increases database/API load and makes the whole page sensitive to connection instability.

**Recommended fix:**

- Build one or a small number of owner-scoped dashboard RPCs/views returning only required aggregates and recent rows.
- Combine setup counts into one query/RPC.
- Avoid selecting `*` for goals.
- Store or cache market-price refresh independently from page rendering.
- Add server timing around Supabase, market refresh, calculations, and render.
- Keep the existing availability model so one failed section does not fabricate data.

### A-09 — External API reliability contract is inconsistent

**Severity:** Medium/High  
**Area:** Reliability / cost

Current provider calls generally lack explicit timeout and retry policy. Alpha Vantage can issue ten quote requests in parallel. CoinGecko is called through the keyless base URL even though stable Demo access is designed around an API key. Exchange-rate fallback does not include fallback age/source metadata.

**Recommended fix:**

Create a shared provider adapter contract with:

- timeout and abort
- normalized error codes
- quota/rate-limit classification
- retry policy
- cache TTL and stale-while-revalidate policy
- source, observed timestamp, market timestamp, and stale status
- provider-specific concurrency limits
- telemetry without keys or user finance data
- circuit breaker after repeated provider failure

For stocks, batch where the provider contract allows it or limit concurrency to one/few requests. Consider a provider with a documented multi-symbol contract if the product needs larger portfolios.

### A-10 — Fixed FX fallback can become misleading

**Severity:** Medium  
**Area:** Financial accuracy

`FALLBACK_USD_PKR_RATE` is hardcoded as `281.2`. The UI can identify a fallback as non-live, which is good, but a fixed value has no effective date and can age indefinitely.

**Recommended fix:**

- Store `rate`, `source`, `asOf`, `fetchedAt`, and `stale`.
- Persist the last successful rate in a small shared table or cache.
- Fall back in this order: current provider -> last known successful rate -> clearly labeled bundled emergency rate.
- Display “approximate, last updated …” where conversion materially affects the view.
- Use an official Pakistan source for reference/validation where licensing and format permit.

### A-11 — Large files combine too many responsibilities

**Severity:** Medium  
**Area:** Maintainability / testing

Examples include:

- `app/api/ai-insights/route.ts` at more than one thousand lines
- `app/login/page.tsx` with state machine, validation, provider logic, error mapping, resend timing, and rendering in one client component
- `components/landing/PremiumLandingPage.tsx` with all marketing sections and previews in one file
- settings implementations containing hundreds of lines

**Recommended fix:**

Split by responsibility without changing behavior:

- AI: repository/data summary, deterministic calculations, prompt builders, provider client, schemas, HTTP route
- Auth: reducer/state machine, validation/error mapping, provider actions, step components
- Landing: header, hero, capabilities, workflow, privacy, CTA, footer, preview
- Settings: route data adapter, category manager, profile/security/preferences sections

### A-12 — Parallel settings generations and CSS patch layering

**Severity:** Medium  
**Area:** UI architecture

Repository search shows multiple settings implementations such as `SettingsExperience.tsx`, `SettingsExperienceV2.tsx`, `SettingsOneUI.tsx`, `CategoryManagementExperience.tsx`, and `CategoriesSettings.tsx`. Route and global styling also import multiple files named `polish`, `fixes`, `final`, `enhancements`, or `safety`.

This pattern is understandable during iterative redesign, but it makes the active source of truth unclear and creates cascade regressions.

**Recommended fix:**

- Identify the one active implementation for each feature through import graph verification.
- Mark candidates as active, adapter, or dead.
- Remove dead files only in a dedicated cleanup PR after screenshots/tests/build.
- Consolidate repeated responsive/card/auth rules into semantic component styles or a small set of route stylesheets.
- Add visual regression coverage before CSS consolidation.

### A-13 — Broad ESLint rule disablement hides useful defects

**Severity:** Medium  
**Area:** Code quality

The global ESLint configuration disables rules including explicit `any`, unescaped entities, hook set-state-in-effect, and static-component checks.

**Recommended fix:**

- Re-enable rules globally.
- Use narrow file-level exceptions with a reason and issue reference.
- Prioritize hooks/static-component warnings in high-render client areas.
- Add a no-new-warning policy in CI.

### A-14 — Likely unused/overlapping dependencies

**Severity:** Medium/Low  
**Area:** Bundle size / supply chain

Static source search found no runtime imports for:

- `@anthropic-ai/sdk`
- `@stripe/stripe-js`
- `stripe`

The package `motion` also appears redundant with the actively imported `framer-motion`. Base UI, Radix UI, aggregate `radix-ui`, and shadcn packages may overlap.

**Recommended fix:**

- Run `knip`, dependency-cruiser, or a verified import audit.
- Remove one candidate at a time.
- Regenerate `package-lock.json` with `npm install`/`npm uninstall` as appropriate.
- Run `npm run check`, production build, and representative browser flows.
- Keep Stripe only when billing scope and webhook architecture are approved.

### A-15 — Auth security can be strengthened

**Severity:** Medium  
**Area:** Authentication

Current auth is thoughtful, but signup UI accepts six characters as a minimum, CAPTCHA is not visibly integrated, and MFA/passkeys are not implemented.

**Recommended fix:**

- Align UI password requirements with the configured Supabase policy; prefer 10–12+ characters and breached-password protection where available.
- Configure Supabase rate limits and CAPTCHA/Turnstile for signup, login abuse, and recovery requests.
- Add optional TOTP MFA for users who want stronger protection.
- Add recent-login/reauthentication requirements for password changes, account deletion, and future billing/export-sensitive operations.
- Keep generic account-enumeration-safe recovery messages.

### A-16 — AI privacy and product disclosure need explicit treatment

**Severity:** Medium  
**Area:** Privacy / trust

The AI route sends summarized finance information to Google. The source minimizes data relative to raw transactions, but users should not have to infer that third-party processing occurs.

**Recommended fix:**

- Add a concise AI privacy notice before first use.
- Document categories of summarized data sent, provider, purpose, retention assumptions, and how to disable it.
- Make AI optional and avoid generating automatically before user consent if policy requires it.
- Do not send names, notes, transaction descriptions, or identifiers unless a future feature clearly requires and discloses them.

### A-17 — SEO host configuration is hardcoded

**Severity:** Medium  
**Area:** SEO / deployment portability

The production Vercel hostname is repeated in root metadata, robots, and sitemap. This can produce incorrect canonical links when a custom domain is added or in preview environments.

**Recommended fix:**

- Add a validated `NEXT_PUBLIC_SITE_URL` or server-only `SITE_URL`.
- Use the canonical production domain in production and safe preview behavior elsewhere.
- Add `noindex` metadata for login, reset, onboarding, preview, and private route layouts.
- Remove obsolete top-level private-path disallows that do not match the actual `/dashboard/...` route hierarchy, while retaining `/dashboard/` and `/api/` protections.
- Do not set sitemap `lastModified` to the current time on every generation; use a real content/deploy date or omit it.

### A-18 — Accessibility needs automated and manual certification

**Severity:** Medium  
**Area:** Accessibility

Positive evidence includes semantic regions/headings, labels, focus handling, minimum control heights, icon hiding, chart descriptions, live status regions, and reduced-motion handling. Missing evidence includes a committed keyboard-only script, screen-reader pass, 200%/400% zoom coverage, automated axe checks, and color-contrast regression tests.

**Recommended fix:**

- Add a skip link to the primary content if not already rendered by the active shell.
- Add Playwright + axe tests for landing, auth steps, onboarding, dashboard, one modal per finance type, settings, and error states.
- Test keyboard trap/escape/return-focus behavior for every modal/menu.
- Test chart alternatives and meaningful text summaries.
- Test Windows high contrast, reduced motion, 200% zoom, 320 CSS px reflow, and screen readers.

### A-19 — PWA cache hygiene can improve

**Severity:** Medium/Low  
**Area:** Offline / storage

The service worker correctly bypasses private dashboard/auth/API routes and framework chunks. However, the generic cache-first path has no maximum entries/age, may cache non-success responses, and relies on manual cache-version changes.

**Recommended fix:**

- Cache only successful, expected public assets.
- Add cache age/entry limits.
- Keep private pages, authenticated APIs, and `/_next/` network-managed.
- Add an offline/version test in CI or Playwright.
- Clarify that offline mode is a read-only shell fallback, not offline finance-data mutation.

### A-20 — Public APIs need application-level abuse controls

**Severity:** Medium  
**Area:** Availability / cost

The exchange-rate endpoint is public; other market and AI routes are protected, but provider-cost controls are not consistently visible.

**Recommended fix:**

- Add Vercel Firewall/rate-limit rules or server-side rate limiting.
- Apply tighter limits to search, quote, AI generation, and chat than to cached exchange-rate reads.
- Cache normalized responses at the server boundary.
- Return `429` with safe retry metadata.
- Monitor provider quota and cost by route, never by raw user finance payload.

### A-21 — Error handling is good but external failures need typed contracts

**Severity:** Medium  
**Area:** Reliability

The UI often distinguishes unavailable/partial states and error boundaries are present. Provider errors are still represented through ad-hoc `Error.name` strings and broad catches.

**Recommended fix:**

Create typed application errors such as:

- `configuration_error`
- `authentication_required`
- `stale_session`
- `provider_rate_limited`
- `provider_timeout`
- `provider_unavailable`
- `invalid_provider_response`
- `data_partial`
- `database_conflict`
- `validation_error`

Map them once to HTTP status, logging level, user-safe copy, retryability, and Sentry fingerprint.

### A-22 — Sentry filtering is a verified strength

**Severity:** Positive finding

The shared Sentry filter removes users, request URL/query/body/headers/cookies, extra fields, and values whose keys imply accounts, amounts, authentication, balances, cards, email, passwords, transactions, transfers, or user identity. `sendDefaultPii` is disabled.

**Recommendation:** Preserve this behavior, add tests for the scrubber, and avoid weakening it when adding AI/provider telemetry.

### A-23 — Test strategy lacks end-to-end financial invariants

**Severity:** Medium  
**Area:** Quality

The repository has meaningful unit tests and CI, but the highest-risk behavior—concurrent balance mutation, transfer ownership, migration reconciliation, auth browser recovery, responsive modal behavior, AI quota fallback, and provider staleness—needs integration/end-to-end coverage.

**Recommended fix:**

- Add Supabase integration tests against a disposable local project/database.
- Add Playwright browser tests.
- Add property-based tests for financial calculations.
- Add migration tests from representative historical schemas.
- Add Lighthouse CI budgets.
- Add dependency/security scanning such as CodeQL and GitHub secret scanning/push protection.

### A-24 — Missing regional semantics

**Severity:** Medium/Low  
**Area:** Product correctness

The application supports PKR and USD and detects Pakistan from locale/timezone, but explicit timezone and locale preferences are missing. Date-only finance fields can behave differently when users travel or when server UTC differs from the user's intended accounting day.

**Recommended fix:**

- Store an explicit IANA timezone and locale in the profile.
- Define whether transaction dates are accounting dates or instants.
- Keep date-only fields as date-only strings throughout calculations.
- Make report periods use the user's configured accounting timezone.
- Add tests around month/year boundaries and Asia/Karachi.

---

## 8. Recommended fixes ranked by priority

### Priority 0 — Before touching balance logic or scaling users

| Work item | Why now | Acceptance criteria |
| --- | --- | --- |
| Audit account/transfer ownership consistency | Prevent one-sided transfer records | Read-only report shows every transfer's owner matches both accounts; no rows are modified during audit. |
| Add composite transfer/account ownership constraints | Enforce integrity in PostgreSQL, not only UI | Cross-user or mismatched transfer insert/update fails atomically. |
| Add balance reconciliation report | Detect historical drift safely | Per-account stored vs ledger-derived balance diff is exportable and reviewed. |
| Back up before any repair | Protect user data | Verified backup and rollback procedure exist before migration. |

### Priority 1 — Next production-hardening cycle

| Work item | Estimated effort | Acceptance criteria |
| --- | ---: | --- |
| Typed environment validation | 0.5–1 day | Missing required variable fails clearly before broad runtime traffic; no values logged. |
| Pin Node and align CI/Vercel | 0.5 day | CI and Vercel use the same major; no open-ended major upgrades. |
| Remove/block production preview route | 0.25 day | `/login-step5-preview` returns 404 in production and is absent from sitemap/indexing. |
| AI structured output, timeout, rate limit, cache | 2–4 days | Invalid JSON and 429 frequency materially decrease; fallback remains available. |
| Strict CSP report-only rollout | 1–3 days | Report-only violations are understood; production policy removes unsafe/broad directives where possible. |
| External provider timeout/quota layer | 2–3 days | Every provider has timeout, normalized errors, cache, stale metadata, and controlled concurrency. |

### Priority 2 — Performance and maintainability

| Work item | Estimated effort | Acceptance criteria |
| --- | ---: | --- |
| Consolidate dashboard read model | 2–5 days | Fewer network/database calls with identical financial outputs and failure semantics. |
| Move price refresh out of critical dashboard render | 1–3 days | Dashboard remains fast when providers are slow/down; price staleness is visible. |
| Split AI/auth/settings large files | 3–6 days | Smaller independently tested modules; no UX or behavior change. |
| Remove verified dead dependencies/components | 1–3 days | Lockfile shrinks, build/tests pass, visual snapshots unchanged. |
| Consolidate CSS layers | 3–7 days | One source of truth per route/component with visual regression evidence. |
| Add Playwright/axe/Lighthouse CI | 3–5 days | Core flows and performance/a11y budgets run in CI. |

### Priority 3 — Product completeness

- Secure account deletion with reauthentication, export, grace/retention policy, and audit logging
- MFA and CAPTCHA
- Richer notification rule engine
- Styled PDF receipts
- Locale/timezone settings
- Help/guide center
- Billing only after product/pricing decisions; otherwise remove Stripe packages and environment placeholders
- Licensed PSX data integration if Pakistan equities become a supported feature

---

## 9. Non-destructive database repair plan

Do not run an automatic “recalculate every balance” migration first. Use this sequence:

1. **Create a production backup and restore test.** A backup is not complete until restoration is proven.
2. **Snapshot relevant tables** to an audit schema or encrypted export: accounts, transactions, account transfers, liabilities, liability payments.
3. **Create read-only diagnostics** for:
   - transfer owner mismatch
   - missing/archived referenced accounts
   - duplicate trigger presence
   - stored versus ledger-derived account balance
   - payment total versus liability paid amount
4. **Review the diff with the owner.** Separate expected opening balances/manual adjustments from unexplained drift.
5. **Add relationship constraints as `NOT VALID`.** This protects new writes after validation planning without immediately failing on unknown historical rows.
6. **Repair only identified rows** with an explicit mapping or approved adjustment ledger. Never delete unexplained finance rows silently.
7. **Validate constraints.** Make validation failure visible and reversible.
8. **Harden transfer mutation.** Use a transaction-safe function that locks accounts and checks affected rows.
9. **Add reconciliation monitoring.** Run a scheduled read-only check and alert only when a difference appears.
10. **Document accounting invariants** in migrations and code tests.

Suggested invariant tests:

- Insert income increases one account once.
- Insert expense decreases one account once.
- Update amount/type/account reverses the old effect and applies the new effect once.
- Delete restores the original effect once.
- Transfer decreases source and increases destination atomically.
- Failed destination/source validation changes neither balance.
- Repeated request/idempotency key cannot duplicate a transfer.
- Concurrent transfers cannot produce lost updates.
- Refund semantics are explicit and tested.

---

## 10. Performance improvement plan

### Measure first

Add:

- Vercel Speed Insights and Web Analytics where appropriate
- server timing for Supabase, market providers, AI, and calculation phases
- Sentry transaction names and provider fingerprints without finance values
- bundle analysis in a non-production CI job
- Lighthouse CI for public/auth shell

### Server-side priorities

- Consolidate dashboard aggregates into owner-scoped SQL views/RPCs.
- Select only required columns.
- Use indexes validated through Supabase Performance Advisor and `EXPLAIN (ANALYZE, BUFFERS)` on representative data.
- Cache public exchange-rate responses and normalized provider results.
- Avoid waiting on stock/crypto providers in the main dashboard render path.
- Cache AI output by summary hash.
- Keep dynamic rendering only where authentication or live data requires it.

### Client-side priorities

- Move motion/currency/PWA providers into route groups if public pages do not need the full authenticated client bundle.
- Lazy-load heavy charts and modal-only code where useful.
- Remove duplicate libraries and dead UI generations after verification.
- Consolidate CSS to reduce cascade work and unused styles.
- Keep `prefers-reduced-motion` behavior.
- Use real-user Core Web Vitals before changing animations that users value.

---

## 11. Security hardening checklist

- [ ] Composite ownership constraints for all child/parent finance relationships
- [ ] Balance reconciliation and immutable adjustment model
- [ ] Typed environment validation
- [ ] Node runtime pinned and matched in CI
- [ ] Strict CSP staged through report-only
- [ ] Internal preview routes excluded from production
- [ ] Supabase Security/Performance Advisor reviewed after every migration
- [ ] CAPTCHA and auth rate limits configured
- [ ] Optional MFA implemented
- [ ] Reauthentication for destructive/security-sensitive actions
- [ ] Per-user/IP rate limits for AI and market APIs
- [ ] AI third-party processing disclosure and opt-out/consent
- [ ] GitHub secret scanning and push protection enabled
- [ ] CodeQL/security workflow enabled
- [ ] Dependabot PRs reviewed with tests/build
- [ ] Sentry scrubber regression tests
- [ ] PSX or other market-data licensing reviewed before redistribution
- [ ] Account deletion/retention policy defined before implementation

---

## 12. SEO audit

### Strengths

- Root metadata with title template, description, keywords, creator/publisher/category
- Canonical and Open Graph metadata
- Twitter card metadata
- Dynamic OG/Twitter image routes
- Robots and sitemap routes
- Private dashboard and API paths disallowed
- Public landing is server-rendered and semantically structured

### Improvements

1. Replace hardcoded Vercel hostname with validated site URL configuration.
2. Add `noindex, nofollow` metadata to auth, reset, onboarding, internal preview, and protected layouts.
3. Remove/block the production preview route.
4. Use a real content/deploy modification date or omit `lastModified` rather than generating “now.”
5. Add structured data only when it is truthful and useful; an `Organization` or `SoftwareApplication` schema can be added after product name, pricing, and support/contact data are stable.
6. Verify canonical behavior after a custom domain is introduced.
7. Add Search Console monitoring for unexpected indexed routes.

---

## 13. Accessibility audit

### Positive implementation evidence

- Semantic headings and region labels
- Screen-reader-only labels and captions
- `aria-live`/status behavior for partial data
- Decorative icons generally use `aria-hidden`
- Touch targets commonly use approximately 44 px minimum height
- Focus is moved intentionally between auth steps
- Reduced-motion checks in landing/motion code
- Text summaries and truthful empty/error states
- Native `details/summary` for the landing mobile menu
- Chart preview includes a textual ARIA label

### Required formal verification

- Keyboard-only navigation for every route and modal
- Focus trap, escape, and focus restoration
- Screen-reader testing with NVDA/JAWS/VoiceOver
- 200% and 400% zoom/reflow
- 320 CSS px layout
- High contrast/forced colors
- Light/dark contrast checks
- Axe/Playwright automated tests
- Chart data alternatives and tooltip keyboard behavior
- Form validation announcement timing
- Toast announcement behavior

Automated tools find only a portion of accessibility problems; retain manual testing.

---

## 14. Error handling and observability

### Current strengths

- Global and dashboard error boundaries
- Retry actions
- User-safe error copy
- Availability/partial metadata instead of fabricated values
- Sentry capture
- Financial/PII scrubbing
- Offline fallback
- Provider fallback for AI and FX

### Current Vercel runtime signals reviewed

Recent production logs included:

- AI provider returned an invalid JSON shape
- Invalid/missing refresh-token errors in middleware
- `fetch failed`, socket closure, and timeout symptoms on dashboard requests
- Historical missing Supabase URL/key configuration in middleware
- Gemini `429 RESOURCE_EXHAUSTED`

### Recommended operational alerts

- Error-rate threshold by route and release
- AI 429/invalid-output ratio
- Supabase auth transient versus stale-session ratio
- Dashboard p95 server duration
- Provider timeout/rate-limit count
- Reconciliation mismatch count
- Deployment error and rollback alerts
- Build cache growth

Do not include transaction notes, names, balances, account identifiers, prompts, or raw finance summaries in logs.

---

## 15. Dependency and code-quality review

### Keep and continue using

- Next.js / React / TypeScript
- Supabase SSR/client
- Recharts for current chart complexity
- Lucide for icons
- Framer Motion for intentional UI motion
- Sentry
- Vitest
- Tailwind and the semantic token system

### Verify before removal

- `@anthropic-ai/sdk`
- `stripe`
- `@stripe/stripe-js`
- `motion`
- overlapping aggregate UI packages if only their subpackages are used
- inactive settings/category component generations

### Add only with a defined purpose

- Zod for environment, route-body, provider-response, and AI schema validation
- Playwright for end-to-end tests
- `@axe-core/playwright` for automated accessibility checks
- Lighthouse CI for performance/accessibility/SEO budgets
- Optional `knip` for unused file/export/dependency analysis

### Code-quality rules

- Re-enable broadly disabled ESLint rules where possible.
- Require reasons for local suppressions.
- Avoid `select('*')` in production data paths.
- Prefer shared domain types generated from Supabase schema.
- Keep financial calculations pure and covered by table-driven/property tests.
- Keep provider/network code outside UI components.
- Keep migrations forward-only, reviewed, and reversible through backup/repair plans rather than destructive down migrations.

---

## 16. Setup and local development instructions

### Prerequisites

- Node.js matching the production major. Current Vercel uses Node 24; after the recommended pin, use Node `24.x`.
- npm matching the lockfile workflow
- A Supabase project
- Supabase CLI for migration/local-database workflows
- Optional provider accounts for AI, stocks, crypto, FX, Sentry, and future billing

### Clone and install

```bash
git clone https://github.com/maijamalhoon/Jamals-finance.git
cd Jamals-finance
npm ci
```

Use `npm ci` for reproducible installs. Use `npm install` only when intentionally changing dependencies/lockfile.

### Environment file

```bash
cp .env.example .env.local
```

Windows Command Prompt:

```bat
copy .env.example .env.local
```

### Required variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Optional/current integration variables

```env
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

GEMINI_API_KEY=
GEMINI_MODEL=

ALPHA_VANTAGE_API_KEY=
EXCHANGE_RATE_API_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

Recommended additions:

```env
SITE_URL=http://localhost:3000
COINGECKO_DEMO_API_KEY=
AI_INSIGHTS_ENABLED=false
MARKET_DATA_ENABLED=false
```

Do not add the recommended variables until code explicitly supports them. Remove Stripe variables from the template if billing remains unimplemented.

### Supabase setup

1. Create/link a development Supabase project.
2. Review every migration in chronological order.
3. Apply migrations to a disposable/local database first.
4. Run Supabase database lint/advisors.
5. Seed only non-sensitive development data.
6. Confirm RLS with two separate test users.
7. Never copy production finance data into local development without an approved anonymization process.

### Development

```bash
npm run dev
```

### Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Or:

```bash
npm run check
npm run build
```

Additional recommended checks:

```bash
git diff --check
npx playwright test
npx lhci autorun
```

The latter commands require the recommended tools/configuration to be added first.

---

## 17. Vercel build and deployment instructions

### Current project configuration

- Framework: Next.js
- Source branch: `main`
- Production Node runtime: 24.x
- Build command: framework default / `npm run build`
- Production domain: https://jamals-finance-sable.vercel.app
- Current deployment status: Ready

### Recommended project settings

1. Pin Node to the same major used in `package.json` and CI.
2. Configure variables separately for Development, Preview, and Production.
3. Do not expose server secrets with `NEXT_PUBLIC_`.
4. Enable deployment protection for sensitive previews.
5. Enable Speed Insights and appropriate observability.
6. Configure firewall/rate-limit controls for AI and provider-backed APIs.
7. Keep Git integration on reviewed `main` commits.
8. Require CI checks before merge.
9. Retain a known-good deployment for rollback.

### Deployment process

1. Create a focused branch.
2. Apply non-destructive changes.
3. Run targeted tests, `npm run check`, and `npm run build`.
4. Open a PR with migration/environment/UI notes.
5. Review the Vercel Preview deployment.
6. Test public, auth, dashboard, one transaction, one transfer, one report, settings, AI fallback, and mobile layouts.
7. Merge only after checks pass.
8. Verify the exact production commit SHA.
9. Watch Vercel/Sentry errors after release.
10. Roll back immediately if financial integrity or authentication behavior regresses.

### Production smoke checklist

- Landing and metadata load
- Login/signup/recovery render without hydration errors
- Protected route redirects correctly
- Existing user dashboard loads
- New transaction changes the correct balance once
- Transfer changes both accounts exactly once
- Partial provider state remains truthful
- AI falls back safely when disabled/rate-limited
- Reports and CSV export work
- No horizontal overflow at 320/390 px
- No unexpected indexed preview/private route
- No new Sentry PII fields

---

## 18. Recommended APIs, libraries, documentation, and resources

The following links were selected because they are official documentation or official data portals. Confirm pricing, terms, geography, redistribution rights, and rate limits before production use.

### Core framework and security

| Resource | Link | How it can improve this project |
| --- | --- | --- |
| Next.js App Router docs | https://nextjs.org/docs/app | Authoritative reference for routing, server/client components, caching, metadata, and route handlers. |
| Next.js production checklist | https://nextjs.org/docs/app/guides/production-checklist | Use as a release checklist for security, caching, performance, and production behavior. |
| Next.js CSP guide | https://nextjs.org/docs/app/guides/content-security-policy | Replace broad unsafe CSP directives with a nonce/hash or supported strict policy. |
| Next.js metadata docs | https://nextjs.org/docs/app/api-reference/file-conventions/metadata | Improve canonical, robots, sitemap, OG, and route-specific noindex behavior. |
| Supabase Next.js SSR auth | https://supabase.com/docs/guides/auth/server-side/nextjs | Validate cookie-based server/client auth patterns as `@supabase/ssr` evolves. |
| Supabase RLS | https://supabase.com/docs/guides/database/postgres/row-level-security | Review owner policies and relationship authorization. |
| Supabase database advisors | https://supabase.com/docs/guides/database/database-advisors | Run security/performance lint after migrations and index changes. |
| Supabase MFA | https://supabase.com/docs/guides/auth/auth-mfa | Add optional TOTP MFA and stronger assurance for sensitive actions. |
| Supabase Auth CAPTCHA | https://supabase.com/docs/guides/auth/auth-captcha | Protect signup, login, and recovery from automated abuse. |
| Vercel Node versions | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | Pin and align CI/production runtime. |
| Vercel environment variables | https://vercel.com/docs/environment-variables | Maintain safe environment-specific configuration. |
| Vercel Speed Insights | https://vercel.com/docs/speed-insights | Collect real-user Core Web Vitals and detect regressions. |
| Vercel project/observability docs | https://vercel.com/docs/projects | Manage deployments, logs, domains, protection, analytics, and observability. |
| Sentry Next.js docs | https://docs.sentry.io/platforms/javascript/guides/nextjs/ | Improve release tracking, tracing, alerts, and source maps while preserving scrubbing. |

### Validation, testing, and accessibility

| Resource | Link | How it can improve this project |
| --- | --- | --- |
| Zod | https://zod.dev/ | Validate environment variables, request bodies, provider responses, and AI structured output. |
| Zod JSON Schema | https://zod.dev/json-schema | Reuse one schema for runtime validation and provider JSON schema where compatible. |
| Playwright | https://playwright.dev/docs/intro | Add browser coverage for auth, finance CRUD, modals, responsiveness, and deployment smoke tests. |
| Playwright accessibility testing | https://playwright.dev/docs/accessibility-testing | Run axe checks inside real user flows. |
| axe-core | https://github.com/dequelabs/axe-core | Detect common WCAG/ARIA issues automatically. |
| Lighthouse CI | https://github.com/GoogleChrome/lighthouse-ci | Set performance, accessibility, SEO, and best-practice budgets per PR. |
| Recharts | https://recharts.github.io/en-US/guide/ | Continue using the existing chart library; improve responsive sizing, labels, and accessible summaries. |
| Lucide | https://lucide.dev/ | Continue the existing consistent icon language and tree-shaken React usage. |

### AI

| Resource | Link | How it can improve this project |
| --- | --- | --- |
| Gemini structured output | https://ai.google.dev/gemini-api/docs/structured-output | Enforce the expected insight/chat response schema instead of relying only on prompt instructions. |
| Gemini rate limits | https://ai.google.dev/gemini-api/docs/rate-limits | Design per-user budgets, caching, backoff, and production quota. |
| Gemini troubleshooting | https://ai.google.dev/gemini-api/docs/troubleshooting | Normalize provider errors such as `429 RESOURCE_EXHAUSTED`. |
| Gemini pricing | https://ai.google.dev/gemini-api/docs/pricing | Add cost estimates and usage alerts before scaling automatic generation. |

### Existing financial-data providers

| Resource | Link | How it can improve this project |
| --- | --- | --- |
| Alpha Vantage API docs | https://www.alphavantage.co/documentation/ | Continue stock search/quotes, but design around documented quota, delayed data, caching, and attribution/terms. |
| CoinGecko API key setup | https://docs.coingecko.com/docs/setting-up-your-api-key | Move from anonymous/keyless dependence to a documented Demo/Pro key contract. |
| CoinGecko endpoint docs | https://docs.coingecko.com/reference/endpoint-overview | Validate supported search, price, history, and usage endpoints. |
| ExchangeRate-API overview | https://www.exchangerate-api.com/docs/overview | Current provider documentation for supported endpoints and plan behavior. |
| ExchangeRate-API pair request | https://www.exchangerate-api.com/docs/pair-conversion-requests | Matches the current USD/PKR pair use and helps validate response/error handling. |

### Alternative or supplementary financial sources

| Resource | Link | Recommended use |
| --- | --- | --- |
| Twelve Data | https://twelvedata.com/docs/introduction/overview | Evaluate as an alternative unified stocks/forex/ETF/crypto provider with REST/WebSocket and documented null/error handling. Compare coverage, latency, licensing, and price before replacing Alpha Vantage. |
| State Bank of Pakistan economic data | https://www.sbp.org.pk/economic-data | Official Pakistan macroeconomic and exchange-rate reference data. Use for validation/history; automate only where format and usage terms support it. |
| SBP open-market closing exchange rates | https://www.sbp.org.pk/economic-data/open-market-closing-exchange-rates | Add a Pakistan-specific reference view or reconciliation source; distinguish open-market, interbank, buying, and selling rates. |
| Pakistan Stock Exchange Data Portal | https://dps.psx.com.pk/ | Official PSX market/company portal for user links and licensed integration discovery. Do not scrape or redistribute market data without rights. |
| PSX data services/licensing | https://www.psx.com.pk/psx/product-and-services/data-services-vending | Contact PSX and obtain the appropriate market-data license before supporting live/delayed PSX quotes. |
| FRED API | https://fred.stlouisfed.org/docs/api/fred/ | Add optional macro context such as interest rates, inflation, and economic series; not for personal account balances. |
| World Bank Indicators API | https://datahelpdesk.worldbank.org/knowledgebase/articles/889392 | Add country-level economic indicators and long-term context. |
| SEC EDGAR APIs | https://www.sec.gov/search-filings/edgar-application-programming-interfaces | Add official US company filings/fundamentals research links for international holdings. Respect SEC fair-access requirements. |

### Billing, only if a paid product is approved

| Resource | Link | How it can be used |
| --- | --- | --- |
| Stripe subscriptions overview | https://docs.stripe.com/billing/subscriptions/overview | Design customers, prices, trials, PaymentIntents, and subscription state. |
| Stripe subscription webhooks | https://docs.stripe.com/billing/subscriptions/webhooks | Build verified, idempotent server webhooks and entitlement updates. Do not ship client-only subscription state. |

If billing is not on the approved roadmap, remove Stripe packages and environment placeholders after verification.

---

## 19. Suggested target architecture

The current application does not need a rewrite. It needs clearer boundaries.

```text
UI routes/components
  -> application services
       -> finance read models / commands
       -> auth/session service
       -> market-data provider interface
       -> AI provider interface
       -> notification rules
  -> typed schemas and domain errors
  -> Supabase/PostgreSQL with RLS + relational ownership constraints
  -> Vercel/Sentry telemetry with privacy filtering
```

### Proposed modules

```text
lib/domain/
  money.ts
  transactions.ts
  transfers.ts
  liabilities.ts
  investments.ts
  reconciliation.ts

lib/data/
  dashboard-repository.ts
  transaction-repository.ts
  settings-repository.ts

lib/providers/
  types.ts
  alpha-vantage.ts
  coingecko.ts
  exchange-rate-api.ts
  gemini.ts

lib/schemas/
  env.ts
  ai.ts
  market.ts
  api.ts

lib/errors/
  application-error.ts
  http-mapping.ts

app/api/.../
  thin authentication + validation + service orchestration
```

This preserves the existing UI and business calculations while making provider replacement, testing, rate limiting, and error handling safer.

---

## 20. 30/60/90-day roadmap

### First 30 days — integrity and reliability

- Read-only transfer/account ownership audit
- Balance reconciliation report
- Composite ownership constraints after review
- Environment validation
- Node pin and CI alignment
- Remove/block preview route
- Gemini schema/timeout/rate-limit/cache
- Provider timeout/concurrency normalization
- CSP report-only rollout

### Days 31–60 — performance and test coverage

- Dashboard aggregate RPC/read model
- Background/stale market-price refresh
- Playwright + axe core-flow tests
- Lighthouse CI budgets
- Sentry release/error alert tuning
- Dependency and inactive-component cleanup
- Begin CSS consolidation with visual snapshots

### Days 61–90 — product hardening

- MFA/CAPTCHA
- Secure account deletion design and implementation
- Timezone/locale preferences
- Styled PDF receipt decision/implementation
- Notification rule expansion
- Help/guide experience
- Licensed PSX integration decision
- Billing decision; implement correctly or remove dormant Stripe surface

---

## 21. Final verdict

Jamal's Finance has a credible product foundation and a notably thoughtful approach to truthful financial states, authentication recovery, responsive presentation, and privacy-aware monitoring. It should not be rewritten, and the current animations, visual language, calculations, and user workflows should be preserved.

The next stage should focus on **proving and enforcing accounting invariants**, **making production configuration deterministic**, **hardening CSP and auth abuse controls**, **making AI/market providers bounded and observable**, and **reducing query/file/CSS complexity with tests protecting current behavior**.

The safest order is:

1. Audit and protect data integrity.
2. Align runtime/configuration and block accidental public surfaces.
3. Stabilize AI and market providers.
4. Reduce dashboard/database cost.
5. Consolidate code and CSS behind regression tests.
6. Add missing product capabilities only after the foundation is measured and stable.

No existing functionality, animation, business logic, or user data needs to be removed to complete these improvements.