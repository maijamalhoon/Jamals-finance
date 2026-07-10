# Jamal's Finance

A privacy-minded personal finance workspace for tracking money movement, accounts, goals, investments, payables, and financial trends from one application.

[Open the live application](https://jamals-finance-sable.vercel.app) · [Report a security concern](SECURITY.md) · [Contribution guide](CONTRIBUTING.md)

> **Project status:** Active development. The product is usable today, while security, reliability, globalisation, reporting, accessibility, and cross-device polish continue to be hardened through scoped roadmap nodes.

## Product direction

Jamal's Finance is being built around four principles:

- **Truthful financial data** — no fabricated balances, fallback investments, artificial trends, or failed queries presented as genuine zero values.
- **Power without clutter** — advanced capability should remain discoverable while default screens stay calm and approachable.
- **Privacy and ownership** — user-owned records are protected through authenticated access and database Row Level Security.
- **Cross-device quality** — layouts, forms, charts, dialogs, and navigation are designed for mobile, tablet, laptop, and desktop use.

## Current capabilities

The application currently includes:

- Public landing experience and protected dashboard routes
- Email/password authentication, email verification, password recovery, and optional Google OAuth configuration
- Account, income, expense, transaction, goal, investment, and payable tracking
- Category management with parent/child category support
- Dashboard summaries and financial activity views
- Period-based analytics for income, expenses, savings, spending categories, cash flow, and investments
- AI insights endpoints and interface under active reliability hardening
- Light, dark, and system theme foundations
- Responsive desktop and mobile navigation
- Supabase-backed persistence with owner-scoped Row Level Security policies
- Sentry integration points for production monitoring
- Vercel production deployment

Some visible modules are still evolving. A control is not considered complete merely because it renders; it must also have truthful behavior, safe failure states, accessibility, responsive states, and production verification.

## Roadmap focus

Current development is organised into small, auditable nodes. Major areas include:

1. Data, settings, session, and AI reliability
2. Shared design system, typography, icons, forms, dialogs, motion, and application states
3. Desktop and mobile application shell
4. Authentication and onboarding
5. Dashboard and every finance module
6. Global locale, currency, and timezone integrity
7. Budgeting, recurring bills, subscriptions, notifications, and reports
8. Landing page, trust, legal, and support experience
9. PWA, offline behavior, performance, accessibility, and production hardening

The roadmap intentionally separates integrity work from visual redesign so that financial correctness and security are not hidden inside large UI changes.

## Technology

| Area | Stack |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, shared design tokens |
| UI and motion | Base UI, Radix UI, Framer Motion, Lucide React |
| Charts | Recharts |
| Backend | Supabase, PostgreSQL, Supabase Auth |
| Security | Row Level Security, protected server/client data access |
| Monitoring | Sentry |
| Testing and quality | Vitest, TypeScript, ESLint, production builds |
| Deployment | Vercel |

## Repository structure

```text
app/
  api/                    Server route handlers
  auth/                   Authentication callback handling
  dashboard/              Protected product routes
  login/                  Login, signup, and reset-request flow
  reset-password/         Password recovery completion
  layout.tsx              Root layout and application metadata
  page.tsx                Public landing page

components/
  analytics/              Analytics presentation
  currency/               Display-currency context
  settings/               Settings experience
  ui/                     Shared UI primitives
  ...                     Feature-specific components

lib/
  analytics/              Deterministic financial calculations and tests
  market/                 Market-data helpers
  supabase/               Browser and server Supabase clients
  ...                     Shared application utilities

supabase/
  migrations/             Versioned database schema and security changes

public/                    Static public assets
proxy.ts                  Route/session boundary logic
```

## Local development

### Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project for authenticated, persistent data

### 1. Clone the repository

```bash
git clone https://github.com/maijamalhoon/Jamals-finance.git
cd Jamals-finance
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the committed template:

```bash
cp .env.example .env.local
```

On Windows Command Prompt:

```bat
copy .env.example .env.local
```

Core local authentication and data access require:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional integrations are configured only when the related feature is enabled:

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

Never commit real credentials. Server secrets must never use the `NEXT_PUBLIC_` prefix.

### 4. Start development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the built production server |
| `npm run lint` | Run ESLint |
| `npm run test:analytics` | Run deterministic analytics tests |
| `npx tsc --noEmit` | Run TypeScript validation |

Feature nodes may add focused test scripts. Review `package.json` for the authoritative current list.

## Quality workflow

Changes should follow a branch-and-review workflow rather than direct pushes to `main`:

```text
fresh main
→ scoped feature branch
→ focused implementation
→ targeted tests
→ typecheck and lint
→ production build
→ diff review
→ pull request
→ squash merge
→ production verification
```

Before requesting review, run the checks relevant to the change. For broad application changes, the expected baseline is:

```bash
npm run test:analytics
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

A passing build does not replace manual verification of responsive layouts, keyboard behavior, empty/error/loading states, or financial semantics.

## Security model

The current security foundation includes:

- Supabase Auth for authenticated access
- Protected dashboard boundaries
- Owner-scoped Row Level Security policies on user-owned finance tables
- Server-only handling for secret integration keys
- Public landing and SEO routes separated from private product routes
- Private dashboard routes excluded from search indexing
- Versioned Supabase migrations for database and policy changes

Security claims are kept deliberately narrow. Local preference toggles are not treated as real authentication factors, and incomplete controls must not imply protection they do not provide.

Please follow [SECURITY.md](SECURITY.md) for responsible disclosure. Do not publish credentials, private financial records, authentication tokens, or exploitable security details in a public issue.

## Deployment

Production is deployed through Vercel from the `main` branch:

- Application: [jamals-finance-sable.vercel.app](https://jamals-finance-sable.vercel.app)
- Deployment source: reviewed and merged `main` commits

Environment variables must be configured separately for local, preview, and production environments. A deployment is considered complete only after the expected commit SHA is live and the affected flow is manually verified.

## Contributing

This repository is publicly visible, but product direction and merges are maintained by the project owner. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

No open-source license has been granted for this repository. Unless a formal license is added, all rights are reserved and public visibility does not grant permission to copy, redistribute, sublicense, or commercially use the source.

## Author

Built and maintained by **Jamal Yaqoob**.
