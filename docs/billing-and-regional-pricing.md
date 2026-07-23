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

The initial commercial system registry includes:

- Simple Shop
- Retail & POS
- Restaurant
- Dealership
- Wholesale & Distribution
- E-commerce
- Service Business
- Professional Services
- Construction
- Manufacturing
- General Company
- Enterprise Group
- Custom Business

## Scoped billing accounts

Billing no longer assumes one user equals one subscription. The authoritative scope is `billing.accounts`:

- `personal` — one per authenticated identity
- `business` — one per `public.businesses` workspace
- `enterprise_group` — one per enterprise group

A user can therefore own personal finance plus multiple companies without subscriptions or invoices colliding. Business subscriptions use `account_id`; they do not reuse the owner's personal subscription.

The private billing source of truth consists of:

- `billing.accounts`
- `billing.plans`
- `billing.customers`
- `billing.subscriptions`
- `billing.regional_prices`
- `billing.plan_features`
- `billing.business_systems`
- `billing.enterprise_groups`
- `billing.enterprise_group_businesses`
- `billing.webhook_events`

## Setup-to-payment flow

1. The user creates a business workspace and chooses its nature and operating style.
2. The workspace is assigned a separate billing account and Business Free subscription.
3. The user is taken to `/billing/choose-plan?businessId=...`.
4. The plan screen prominently shows the business name and selected business system.
5. Continue Free remains visible alongside regional paid plans.
6. A paid choice opens `/billing/checkout` for a final workspace-scoped review.
7. Provider checkout remains disabled until approval, products, price IDs, signature verification, and sandbox lifecycle tests are complete.

The UI never reports a successful payment before a verified provider webhook updates the private billing state.

## Regional pricing

Every supported ISO country resolves to one of five commercial pricing tiers. Missing country overrides fall back to the middle Tier C rather than the highest price. These tiers are a launch pricing policy, not an official economic classification.

The UI shows a USD-equivalent preview. The payment provider remains the final authority for billing country, supported local currency, taxes, and country-specific price overrides. A browser IP or user-controlled dropdown is never trusted as the final billing country.

## Access and status behavior

Server-side access functions resolve personal, business, or enterprise billing scope before a paid operation runs. Hiding a button in the browser is not authorization.

- `trialing`: paid access until `trial_ends_at`
- `active`: paid access through the current period
- `past_due`: paid access only during the recorded or calculated grace period
- `cancelled`: paid access until the paid period ends
- `paused`, `expired`, or `incomplete`: Free access

Business billing snapshots may be read by active workspace members. Only the owner can start a business trial or initiate a subscription change.

## Database and payment security

The `billing` schema remains private. Browser roles receive no direct table access. Narrow authenticated RPC wrappers resolve authorization from `auth.uid()` and return only the billing snapshot required by the application.

Personal and business trial functions bind the claim to an authenticated personal account or owner-controlled business account. Duplicate trial claims are rejected atomically.

JALVORO stores provider customer IDs, subscription IDs, statuses, plan references, quantities, billing country, and webhook payload hashes. It does not store card numbers, CVV values, or raw payment payloads.

`BILLING_CHECKOUT_ENABLED` defaults to `false`. A missing provider configuration returns a truthful unavailable response while Continue Free remains usable.

## Provider launch work still required

1. Complete Paddle business verification.
2. Create monthly and annual prices for Personal Go, Student, Plus, and Pro.
3. Create monthly and annual prices for Business Solo, Starter, Growth, and Scale.
4. Configure country-specific price overrides for both universes.
5. Store provider price IDs in Vercel and map them to `billing.plans`.
6. Implement the Paddle checkout adapter behind the disabled checkout intent endpoint.
7. Implement verified raw-body webhook signature handling.
8. Process create, update, renewal, cancellation, past-due, recovery, refund, and dispute events idempotently through `billing.webhook_events`.
9. Test personal and per-business subscription isolation, multiple companies under one owner, trial replay, upgrades, downgrades, failed payments, refunds, and webhook replay in a disposable Supabase database and Paddle sandbox.
10. Enable `BILLING_CHECKOUT_ENABLED` only after all lifecycle tests pass.
