# Billing and regional pricing foundation

## Product universes

JALVORO uses one identity across two separate commercial universes:

1. **Personal Finance** — one person's accounts, goals, investments, reports, forecasting, and optional personal AI insights.
2. **Business** — one or more isolated business workspaces, each with its own system, users, roles, permissions, subscription, and invoice.

An enterprise group can connect multiple business workspaces for consolidated billing and future group reporting. Personal and business finance data must never be mixed.

## Personal plans

- Free, Go, Student, Plus, and Pro.
- A user may explicitly claim one 14-day Pro trial.
- The trial requires no card, never auto-charges, and never deletes data when it expires.
- Student is separately verified and receives a controlled personal AI allowance.
- AI entitlements exist only in the Personal Finance universe.

## Business plans

- Business Free, Solo, Starter, Growth, Scale, and Enterprise.
- Business Free remains visible after setup and is always a valid choice.
- A business owner may explicitly claim one 14-day Growth trial for that business account.
- Plans control seats, branches, governance, reporting, and integration capacity.
- Business and enterprise plans contain no AI entitlement and business data is not sent to an AI provider through this billing node.
- Enterprise is contract/invoice based rather than self-service checkout.

## Nature-specific business systems

A dealership, POS operation, restaurant, construction company, manufacturer, service business, and general company are not merely feature labels. Each is a distinct operating system with purpose-built roles, screens, conditions, calculations, and workflows.

They may reuse verified primitives such as double-entry accounting, contacts, tax calculations, inventory movement, permissions, audit events, and currency handling. Reuse must improve accuracy without collapsing different business natures into one generic UI.

The initial commercial system registry includes Simple Shop, Retail & POS, Restaurant, Dealership, Wholesale & Distribution, E-commerce, Service Business, Professional Services, Construction, Manufacturing, General Company, Enterprise Group, and Custom Business.

## Scoped billing accounts

Billing does not assume one user equals one subscription. The authoritative scope is `billing.accounts`:

- `personal` — one per authenticated identity
- `business` — one per `public.businesses` workspace
- `enterprise_group` — one per enterprise group

A user can therefore own personal finance plus multiple companies without subscriptions or invoices colliding. Business subscriptions use `account_id`; they do not reuse the owner's personal subscription.

The private billing source of truth consists of `billing.accounts`, `billing.plans`, `billing.customers`, `billing.subscriptions`, `billing.regional_prices`, `billing.plan_features`, `billing.business_systems`, `billing.enterprise_groups`, `billing.enterprise_group_businesses`, and `billing.webhook_events`.

## Setup-to-payment flow

1. The user creates a business workspace and chooses its nature and operating style.
2. The workspace receives a separate billing account and Business Free subscription.
3. The user is taken to `/billing/choose-plan?businessId=...`.
4. The plan screen prominently shows the business name and selected business system.
5. Continue Free remains visible alongside regional paid plans.
6. A paid choice opens `/billing/checkout` for a final workspace-scoped review.
7. The authenticated owner requests `/api/billing/checkout`.
8. The server resolves the approved Paddle price ID from environment configuration and creates a Paddle transaction containing the private JALVORO billing-account reference in `custom_data`.
9. The browser is redirected only to the returned Paddle-hosted HTTPS checkout URL.
10. Access changes only after the verified webhook receiver applies the provider event.

An existing provider subscription cannot start a second self-service checkout. It must use the hosted customer portal for payment methods, invoices, plan management, and cancellation.

## Paddle webhook receiver

`supabase/functions/paddle-webhook/index.ts` is the public provider callback. Deploy it as an unauthenticated external webhook endpoint using `--no-verify-jwt`; Paddle authentication is performed inside the function.

The receiver:

- reads the exact raw request body before JSON parsing
- verifies `Paddle-Signature` using HMAC-SHA256 and a bounded timestamp tolerance
- accepts secret rotation headers containing multiple `h1` signatures
- caps the request body at 256 KiB
- hashes the raw payload but never stores or logs it
- normalizes only the provider IDs, lifecycle state, period, price, billing-account reference, and billing country required by JALVORO
- calls the service-role-only `apply_paddle_webhook_event` RPC
- returns non-2xx for processing failures so Paddle retries

The database function provides event-ID idempotency, retries previously failed events, rejects stale out-of-order events using `occurred_at`, validates Paddle ID formats, validates plan/account-universe compatibility, and updates the scoped subscription atomically.

Recommended subscribed events:

- `subscription.created`
- `subscription.updated`
- `subscription.activated`
- `subscription.trialing`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`
- `subscription.canceled`
- `transaction.completed`
- `transaction.past_due`
- `transaction.payment_failed`

## Hosted billing management

`/api/billing/portal` creates a temporary authenticated Paddle customer-portal session. Personal users may manage their own billing profile; business access is owner-only. Portal URLs are generated on demand, returned with `Cache-Control: private, no-store`, never persisted, and never embedded in an iframe.

## Regional pricing

Every supported ISO country resolves to one of five commercial pricing tiers. Missing country overrides fall back to the middle Tier C rather than the highest price. These tiers are a launch pricing policy, not an official economic classification.

The UI shows a USD-equivalent preview. Paddle remains the final authority for billing country, supported local currency, taxes, and country-specific price overrides. A browser IP or user-controlled dropdown is never trusted as the final billing country.

## Access and status behavior

Server-side access functions resolve personal, business, or enterprise billing scope before a paid operation runs. Hiding a button in the browser is not authorization.

- `trialing`: paid access until `trial_ends_at`
- `active`: paid access through the current period
- `past_due`: paid access only during the recorded or calculated grace period
- `cancelled`: paid access until the paid period ends
- `paused`, `expired`, or `incomplete`: Free access

Business billing snapshots may be read by active workspace members. Only the owner can start a business trial, initiate checkout, or create a billing-management portal session.

## Database and payment security

The `billing` schema remains private. Browser roles receive no direct table access. Narrow authenticated RPC wrappers resolve authorization from `auth.uid()` and return only the billing snapshot or management references required by the server.

JALVORO stores provider customer IDs, subscription IDs, transaction IDs, statuses, plan references, quantities, billing country, provider event time, and webhook payload hashes. It does not store card numbers, CVV values, bank credentials, raw payment payloads, or temporary portal links.

The Next.js application has no administrative Supabase key. The isolated Supabase Edge Function uses the platform-provided secret key only after Paddle signature verification. `BILLING_CHECKOUT_ENABLED` defaults to `false`; missing configuration fails without changing access and Continue Free remains usable.

## Secrets and deployment

Set Paddle API and price IDs in Vercel for checkout and portal creation. Set `PADDLE_WEBHOOK_SECRET` and optional `PADDLE_WEBHOOK_TOLERANCE_SECONDS=300` in Supabase Edge Function secrets. Supabase automatically provides `SUPABASE_URL` plus secret/service-role credentials to hosted Edge Functions.

Deploy the webhook only after applying migrations:

```bash
supabase functions deploy paddle-webhook --no-verify-jwt
```

Point the Paddle notification destination to:

```text
https://<project-ref>.supabase.co/functions/v1/paddle-webhook
```

## Provider launch work still required

1. Complete Paddle business verification and approve the default checkout payment link/domain.
2. Create monthly and annual prices for Personal Go, Student, Plus, and Pro.
3. Create monthly and annual prices for Business Solo, Starter, Growth, and Scale.
4. Configure country-specific price overrides for both universes.
5. Put the provider price IDs in Vercel and populate `billing.plans.provider_price_id` with the same IDs.
6. Apply every billing migration to a disposable Supabase database and run `supabase/tests/regional_billing_foundation.sql`.
7. Deploy the webhook function, configure its secrets, and create the Paddle notification destination.
8. Use the Paddle simulator and sandbox to verify signup, renewal, failed payment, recovery, pause, resume, cancellation, upgrade, downgrade, webhook replay, and out-of-order delivery.
9. Add adjustment/refund and dispute policy before enabling customer-facing refund workflows.
10. Enable `BILLING_CHECKOUT_ENABLED=true` only after all lifecycle tests pass.
