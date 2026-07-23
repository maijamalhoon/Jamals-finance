# JALVORO Continuous Global UX Program

Status: active, iterative and intentionally incomplete while the product evolves.

## Product rule

JALVORO will keep changing for months. No phase is described as a permanent final redesign. Every merged phase must leave the product usable, secure, responsive and faster or equally fast than before.

## Non-negotiable boundaries

- Preserve finance calculations, balances, import/export, authentication and user isolation.
- Do not change Supabase data or schema unless the phase explicitly requires a reviewed migration.
- Keep feature availability unlimited unless a separate approved product decision changes it.
- Never trade page speed for decorative UI.
- Respect reduced-motion and no-animation preferences.
- Avoid broad global listeners, observers, CSS and client bundles when a route-scoped alternative exists.
- Keep mobile, tablet, laptop and desktop behavior independently testable.
- Use small reversible pull requests with automated contracts and production builds.
- Production deployment remains a separate release decision from code merge.

## Rolling workstreams

1. Runtime and bundle isolation
2. Landing and authentication surfaces
3. Personal dashboard routes
4. Business workspace routes
5. Forms, dialogs and keyboard behavior
6. Empty, loading, error and offline states
7. Accessibility and localization
8. Core Web Vitals and database-query performance
9. Admin and billing surfaces
10. Brand migration and final public launch assets

## Completion language

Use these states instead of claiming the entire product is finished:

- audited
- improved
- validated
- merged
- preview-ready
- production-ready
- deployed
- monitored

A route can be validated while the wider product remains under continuous development.

## Merge gate

Every UI/performance pull request must preserve business behavior and pass the repository's dependency audit, lint, TypeScript, security contracts, complete tests and production build. Route-specific runtime and accessibility boundaries should be protected by regression tests whenever practical.
