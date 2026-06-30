# Jamal's Finance

A premium personal finance dashboard built to help users track accounts, income, expenses, goals, liabilities, investments, and savings from one clean and secure workspace.

**Live Website:** https://jamals-finance-sable.vercel.app

---

## Overview

Jamal's Finance is a modern finance management web application designed for individuals, freelancers, families, and small business owners who want a clear view of their money without messy spreadsheets.

The app focuses on a smooth user experience, private user data, clean dashboards, and a scalable foundation for a global personal finance product.

---

## Key Features

* **Public Landing Page**
  A premium public homepage for visitors, product explanation, and search visibility.

* **Secure Authentication**
  Protected dashboard access using Supabase Auth and secure session handling.

* **Accounts Management**
  Track cash, bank accounts, wallets, savings, freelance accounts, and other money sources.

* **Transactions Tracking**
  Record income, expenses, transfers, categories, and money movement.

* **Goals & Savings**
  Plan financial goals and track progress toward future targets.

* **Liabilities Management**
  Manage debts, payable amounts, due dates, and payment progress.

* **Investments Tracking**
  Track investment entries and understand portfolio direction.

* **Dashboard Insights**
  Clean finance summaries, visual cards, charts, and money flow overview.

* **Responsive Design**
  Smooth experience across desktop, tablet, and mobile screens.

* **SEO Foundation**
  Metadata, Open Graph tags, sitemap, robots.txt, and public landing page structure.

---

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Framer Motion
* Lucide React
* Recharts
* Sonner

### Backend & Data

* Supabase
* PostgreSQL
* Supabase Auth
* Row Level Security

### Monitoring & Payments

* Sentry
* Stripe

### Deployment

* Vercel

---

## Project Structure

```txt
app/
  dashboard/
  login/
  accounts/
  transactions/
  goals/
  investments/
  liabilities/
  api/
  layout.tsx
  page.tsx
  robots.ts
  sitemap.ts

components/
  Shared UI and dashboard components

lib/
  Supabase clients, helpers, and utility logic

supabase/
  migrations/

public/
  Static assets
```

---

## Security Model

Jamal's Finance is designed with user privacy and secure access in mind.

Current security foundations include:

* Supabase authentication
* Protected dashboard routes
* Public landing page separated from private app routes
* Row Level Security enabled on user data tables
* Private finance data scoped to authenticated users
* Public RPC access reviewed and restricted
* SEO files allowed publicly while private dashboard routes stay protected

Private dashboard sections are not intended to be indexed by search engines.

---

## SEO Setup

The project includes:

* Global metadata
* Open Graph metadata
* Twitter card metadata
* Canonical URL
* `robots.txt`
* `sitemap.xml`
* Public homepage indexing
* Login page noindex
* Private dashboard routes disallowed from crawling

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/maijamalhoon/Jamals-finance.git
cd Jamals-finance
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

ANTHROPIC_API_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

`ANTHROPIC_API_KEY` is used only on the server for AI Insights. Do not prefix it with `NEXT_PUBLIC_`, and never commit real secret values.

Only enable Google authentication when the provider is fully configured in Supabase.

```env
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true
```

### Manual auth QA checklist

Before shipping auth changes, manually verify:

* Email/password login succeeds and incorrect-password errors are readable.
* Signup validation, confirmation email, and duplicate-account states are readable.
* Forgot-password email delivery and reset-password link flow work end to end.
* Google OAuth is hidden when `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false`.
* Google OAuth appears and completes only when the Supabase provider and redirect allowlist are configured.
* Production redirect URLs are present in the Supabase auth allowlist.

### 4. Run the development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## Available Scripts

```bash
npm run dev
```

Runs the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server after build.

```bash
npm run lint
```

Runs lint checks.

---

## Deployment

The project is deployed on Vercel.

Production website:

```txt
https://jamals-finance-sable.vercel.app
```

Recommended deployment flow:

```bash
git add .
git commit -m "Your commit message"
git pull --rebase origin main
git push origin main
```

Vercel automatically builds and deploys changes from the main branch.

---

## Current Status

The project currently includes:

* Premium landing page
* Clean login page
* Protected dashboard routes
* SEO metadata
* Working sitemap and robots file
* Supabase security improvements
* Production deployment on Vercel

---

## Roadmap

Planned improvements:

* Add professional product screenshots
* Improve dashboard mobile polish
* Add user onboarding flow
* Add finance reports and exports
* Add currency and regional settings
* Improve Sentry production monitoring
* Add Stripe subscription plans
* Add product documentation
* Prepare custom domain and brand assets

---

## Author

Built by **Jamal Yaqoob**.

---

## License

This project is currently private/proprietary in product direction.
A formal license can be added later if the project is opened for public contribution.
