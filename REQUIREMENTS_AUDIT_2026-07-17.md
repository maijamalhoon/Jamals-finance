# Jamal's Finance requirements audit

Date: 17 July 2026

Source reviewed: `Complete Website Requirements.docx` (19 pages, 40 numbered requirement sections)

Application reviewed: current local `main` worktree plus an optimized production build

## Executive result

The implemented application is visually and functionally strong after this pass. All existing user-facing routes now share one Atlas design system, with deliberately different light and dark palettes, one Lucide icon language, consistent surfaces and controls, and repaired mobile dialogs. The application passes lint, TypeScript, 287 automated tests, and the optimized Next.js production build.

The requirements file is not yet 100% complete. The remaining gaps are product/backend capabilities rather than unfinished color or spacing work: a broader notification engine, secure account deletion, a direct styled-PDF receipt download, explicit report-local offline/insufficient-data states, regional locale/timezone controls, and dedicated guide/splash/verification surfaces where the document asks for separate page coverage.

Status definitions:

- **Complete**: implemented and verified in the current application, not merely represented by a route.
- **Partial**: the main flow exists, but one or more explicit details in the requirements remain.
- **Missing**: no equivalent complete capability exists yet.

## Line-by-line section matrix

| # | Requirement section | Status | Evidence and remaining detail |
|---:|---|---|---|
| 1 | Overall scope | **Partial** | All current routes and shared components were audited and redesigned; the product-level gaps listed below prevent a 100% scope result. |
| 2 | Product vision | **Complete** | The product is a truthful, private personal-finance workspace with real Supabase-backed data and no invented financial values. |
| 3 | Complete website consistency | **Complete** | Current public, auth, onboarding, dashboard, financial, settings, error, loading, offline, and receipt surfaces use the same design tokens and component language. |
| 4 | Visual design | **Complete** | Reworked hierarchy, spacing, radius, borders, shadows, typography, surfaces, and density across the application. |
| 5 | Theme | **Complete** | System/light/dark behavior is retained; theme metadata updates with the selected mode; the initial theme bootstrap prevents a mismatched first paint. |
| 6 | Color | **Complete** | Light and dark are separately designed palettes, with semantic action, surface, border, text, status, income, expense, chart, focus, hover, selected, and disabled tokens. |
| 7 | Typography and numbers | **Complete** | Consistent type hierarchy, tabular financial numerals, readable labels, and correct positive/negative financial treatment are retained. |
| 8 | Icons | **Complete** | UI icons are standardized on Lucide, with unified sizing, alignment, and 1.9 stroke treatment; the brand mark is consistent across shell/auth/receipt surfaces. |
| 9 | Responsive design | **Complete** | Visually checked at 320, 360, 390, 430, 768, 1024, 1280, 1440, and 1920 px. Core pages and representative income, transfer, goal, and investment dialogs fit mobile viewports. |
| 10 | Layout and scrolling | **Complete** | Page scrolling is preserved, dialogs use intentional internal scrolling, sticky actions remain reachable, and the production 390 px check had no horizontal overflow. |
| 11 | Navigation and shell | **Complete** | Desktop and mobile shell, primary navigation, More menu, notifications, profile access, quick actions, and active states are coherent and responsive. |
| 12 | Landing page | **Complete** | Updated brand presentation, hierarchy, CTA destinations, light/dark treatment, mobile layout, and truthful product messaging. |
| 13 | Authentication | **Complete** | Login, signup, forgot-password, check-email, reset-password, session recovery, validation, safe redirects, and error states remain functional. Native form fallbacks now use POST so credentials cannot enter the URL before hydration. |
| 14 | Onboarding | **Complete** | Rebuilt as a resumable four-step flow: profile, optional first account, module/first-transaction guidance, progress, skip/resume, and explicit completion. |
| 15 | Dashboard | **Complete** | Real-data metrics, meaning-aware trends, quick actions, recent activity, charts, goals, investments, empty/setup guidance, and responsive layouts are implemented. |
| 16 | Financial meaning and accounting | **Complete** | Transfers stay neutral, investment contributions are not described as profit, income/expense meaning is explicit, and current-value portfolio language is qualified. |
| 17 | Transactions | **Complete** | Add/edit/delete/refund/search/filter/details/receipt flows, validation, categories, dates, references, status feedback, and responsive states exist. |
| 18 | Transfers | **Complete** | Source/destination validation, balance movement, neutral accounting treatment, feedback, and responsive modal behavior are implemented. |
| 19 | Receipts | **Partial** | Professional responsive preview and print/save-as-PDF are available. The direct download action still produces a text receipt, not a first-class styled PDF file. |
| 20 | Analytics | **Complete** | Real-data ranges, summaries, comparisons, charts, categories, accounts, trend semantics, partial metadata handling, loading, empty, and error behavior are implemented. |
| 21 | Accounts | **Complete** | Account creation/editing, balances, transaction context, type/currency presentation, validation, empty states, and responsive cards/details are implemented. |
| 22 | Income | **Complete** | Real summaries, lists, add/edit/delete flows, account/category/date/reference fields, validation, feedback, and responsive behavior are implemented. |
| 23 | Expenses | **Complete** | Real summaries, lists, add/edit/delete/refund behavior, validation, feedback, and responsive behavior are implemented. |
| 24 | Goals | **Complete** | Goal creation/editing/contributions/progress/deadlines, validation, states, and the mobile icon selector are implemented. |
| 25 | Payables | **Complete** | Payable creation/editing/payment tracking/status/deadlines, validation, states, and responsive controls are implemented. |
| 26 | Investments | **Complete** | Real user holdings, contributions/current prices, portfolio allocation/performance language, live-market integration with truthful fallbacks, and responsive forms are implemented. |
| 27 | Reports | **Partial** | Weekly/monthly/custom ranges, real summaries, CSV export, print, loading, ready, and empty behavior exist. Explicit report-local offline and insufficient-data presentation is not fully separated from the global recovery experience. |
| 28 | Notifications | **Partial** | A real persistent inbox supports due goal/payable alerts, grouping, read state, mark-all-read, dismiss, one-day snooze, links, and preferences. Report-ready, unusual-spend, large-expense, income-decline, security, and general system notification families are not implemented. |
| 29 | AI financial brief | **Complete** | The feature uses the real API path and user data, with loading, unavailable, retry, and failure behavior; no canned financial claims are presented as generated insight. |
| 30 | Settings | **Partial** | Profile, password, sessions, appearance, theme, notification preferences, currency/date format, categories, export, and sign-out exist. Secure delete-account, explicit locale, and timezone controls are absent. |
| 31 | Loading states | **Complete** | Shared skeletons/spinners and route-level loading states use the redesigned surfaces and reduced-motion behavior. |
| 32 | Empty states | **Complete** | Empty states use consistent icon, explanation, and actionable next-step treatment without fake records. |
| 33 | Error and recovery states | **Complete** | Route errors, global errors, auth recovery errors, offline fallback, retry actions, and user-safe messages exist. |
| 34 | Accessibility | **Partial** | Labels, semantic headings/regions, 44 px targets, keyboard focus, contrast-oriented tokens, status text, reduced motion, and accessible icon buttons are present. A formal independent WCAG audit, full keyboard script, and reliable 200% zoom certification remain to be completed. |
| 35 | Performance | **Partial** | Optimized production build passes, service-worker stale framework chunks are prevented, and first-paint theme handling is improved. No formal Lighthouse/Web Vitals performance budget was supplied or certified in this pass. |
| 36 | Security and data integrity | **Complete** | Existing Supabase auth/session/RLS contracts were preserved; no schema weakening or fake security controls were introduced; redirects, credentials, and recovery behavior have regression coverage. |
| 37 | Complete component states | **Partial** | Shared controls cover default/hover/focus/active/selected/disabled/loading/error/success where applicable. Missing notification/report capabilities also mean their complete state matrices do not yet exist. |
| 38 | Complete page coverage | **Partial** | All existing routes were covered. The document's separate splash, full user-guide/help, dedicated email-verification, delete-account, and richer notification/report-state surfaces do not all exist as standalone experiences. |
| 39 | Final quality | **Partial** | Current implemented surfaces are polished and build-clean; the explicitly listed capability gaps remain before the whole document can be called complete. |
| 40 | Non-negotiable requirements | **Partial** | Truthful data, accounting semantics, responsive actions, theme stability, safe errors, and no fake controls are satisfied. “No missing states/pages” cannot be marked complete until the partial sections above are implemented. |

## 1. Fully completed requirements

Sections 2–18 (except overall scope), 20–26, 29, 31–33, and 36 are complete for the current application. This includes the complete visual system, separate light/dark palettes, icon unification, all existing auth/onboarding/dashboard/finance flows, accounting semantics, AI brief behavior, shared loading/empty/error treatment, and the current security/data-integrity contracts.

## 2. Partially completed requirements

- Overall scope and final coverage because the requirements document includes capabilities not yet present.
- Receipts because direct download is text rather than a styled PDF artifact.
- Reports because report-local offline and insufficient-data states are not fully explicit.
- Notifications because only goal and payable alert families currently exist.
- Settings because secure account deletion and explicit locale/timezone controls are absent.
- Accessibility because formal WCAG, complete keyboard-only, screen-reader, and 200% zoom certification remain.
- Performance because no Lighthouse/Web Vitals budget has been certified.
- Component/page/non-negotiable completion because they inherit the gaps above.

## 3. Still missing

1. A secure server-side delete-account workflow with reauthentication, export/retention choice, and confirmation safeguards.
2. A complete notification rule engine and inbox taxonomy for reports, spending anomalies, large expenses, income decline, security, and system events.
3. Direct downloadable styled PDF receipts, if print/save-as-PDF is not considered sufficient.
4. Explicit report-level offline and insufficient-data states.
5. Explicit locale and timezone preferences.
6. Dedicated splash, full guide/help, and standalone verification surfaces if those must be separate routes rather than integrated states.

## 4. Bugs and inconsistencies found

- Mobile dialogs could render partly off-screen. Shared dialog geometry now pins them inside small viewports with safe-area spacing and bounded height.
- Quick actions could remain over an open dialog. They now hide while a finance modal is active.
- Some select controls switched between uncontrolled and controlled state. Account and category selects now keep stable controlled values.
- Stale service-worker caching of `/_next/` assets could prevent hydration after a deployment. Framework chunks are now network-managed and the shell cache was versioned forward.
- Login/signup/forgot forms could use a native GET fallback before hydration, allowing field values to enter the URL. They now use POST fallbacks and have a regression test.
- Signup links did not consistently open signup mode. Landing CTAs now route explicitly to `?mode=signup`.
- Onboarding previously did not satisfy the required account/guidance/progress/resume contract. It is now a complete four-step flow.
- Brand marks and wording varied between shell, auth, onboarding, metadata, and receipts. They now use one name and icon treatment.
- Next.js development mode still reports a non-blocking `OuterLayoutRouter` key warning on a full reload. The optimized production build has no development overlay and the warning could not be traced to an unkeyed application list; it should be monitored against the framework version rather than hidden with speculative app changes.

## 5. Design and usability improvements made

- Introduced an Atlas light palette with bright neutral surfaces, deep navy text, cobalt primary actions, and restrained teal support.
- Introduced a separately tuned dark palette using navy/slate surfaces, soft off-white text, periwinkle primary actions, and comfortable semantic colors instead of inversion or harsh black.
- Standardized semantic income, expense, success, warning, error, info, chart, border, focus, selected, disabled, and placeholder treatments.
- Reduced excessive glass effects and gradients; strengthened hierarchy through calmer surfaces, borders, spacing, and consistent elevation.
- Unified Lucide icon size, stroke, alignment, containers, and brand use across all existing routes.
- Reworked landing, auth, onboarding, shell, cards, tables, charts, forms, modals, empty/loading/error states, offline page, receipt, and social-preview presentation.
- Improved mobile form height, safe-area behavior, scrolling, sticky actions, touch targets, and goal icon selection.
- Kept all financial, validation, Supabase, currency, auth, and submission behavior intact except where a verified bug required correction.

## 6. Decisions or information still needed

No additional credentials are needed.

Before implementing the remaining backend/product capabilities, decisions are needed for:

- Account deletion: immediate versus grace period, required reauthentication, mandatory export, data-retention policy, and audit requirements.
- Notifications: exact thresholds/rules, delivery channels, report schedule, and whether background cron/email/push delivery is required.
- Receipts: whether print/save-as-PDF is acceptable or a generated branded PDF file is mandatory.
- Regional preferences: supported locales/timezones and whether formatting follows the profile, browser, or account.
- Page structure: whether guide, splash, and verification must be dedicated routes or the existing integrated experiences are acceptable.
- Release: explicit approval to commit/push/deploy these local changes.

## Verification evidence

- `npm.cmd run check`: passed (lint, TypeScript, 22 test files, 287 tests).
- `npm.cmd run build`: passed (optimized Next.js 16.2.9 production build and all routes generated successfully).
- Production browser check: authenticated dashboard loaded in production mode.
- Exact responsive checks: 320, 360, 390, 430, 768, 1024, 1280, 1440, and 1920 px.
- Representative mobile dialogs: income, transfer, goal, and investment.
- Production 390 × 844 income dialog: left 6 px, right 384.4 px, top 6 px, bottom 838 px; fully inside the viewport with no body-level horizontal overflow.

These changes are currently local. They have not been committed, pushed, or deployed.
