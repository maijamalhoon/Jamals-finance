# Billing and regional pricing foundation

## Product decisions

- Plans: Free, Go, Student, Plus, and Pro.
- A user starts on Free and may explicitly claim one 14-day Pro trial.
- The trial does not require a card and never auto-charges.
- Trial expiry or subscription cancellation changes access; it does not delete finance data.
- Student is a separately verified plan with Plus-level features and controlled AI usage.
- Annual pricing is emphasized in lower-price markets to reduce fixed transaction-fee pressure.

## One billing source of truth

This node extends the existing private `billing` schema created by the platform admin foundation. It does not create parallel public customer, subscription, plan, or webhook tables.

The existing tables remain authoritative:

- `billing.plans`
- `billing.customers`
- `billing.subscriptions`
- `billing.webhook_events`

This node adds plan families, provider price references, regional prices, feature policy, usage metering, student verification state, billing country, pricing tier, grace periods, and the atomic trial claim.

## Regional pricing

The application resolves every ISO country code to one of five commercial pricing tiers. Unlisted countries fall back to the middle Tier C so a missing override does not accidentally charge the highest price. These tiers are a launch pricing policy, not an official economic classification.

The UI displays a USD-equivalent preview. Paddle should remain the checkout source of truth and use automatic currency conversion plus country-specific price overrides. Billing country must be taken from the provider transaction/customer record, not trusted from a client-supplied IP or dropdown.

## Access control

`lib/billing/entitlements.ts` is the deterministic application access layer. `lib/billing/server-access.ts` reads the existing authenticated `get_my_billing_snapshot()` RPC instead of exposing private billing tables through the Data API.

Product surfaces must call the server-side access decision before executing a paid action. Hiding a button in the browser is not authorization.

Status behavior:

- `trialing`: paid access until `trial_ends_at`.
- `active`: paid access through the current period.
- `past_due`: paid access only during the recorded or calculated grace period.
- `cancelled`: access continues until the paid period ends.
- `paused`, `expired`, or `incomplete`: Free access.

## Database security

The `billing` schema remains server-only. Browser roles receive no direct table privileges. The public billing snapshot RPC remains the narrow authenticated read surface.

`claim_pro_trial(uuid)` is a `SECURITY INVOKER` function executable only by `service_role`. The API route authenticates the user first and passes that authenticated user ID. The database atomically prevents duplicate trial claims and rejects accounts that already moved beyond Free.

Webhook audit continues to use the existing `billing.webhook_events` table, which stores a payload hash instead of raw payment payloads.

## Provider launch work still required

1. Complete Paddle business verification.
2. Create monthly and annual provider prices for Go, Student, Plus, and Pro.
3. Add country-specific price overrides to those provider prices.
4. Store the provider price IDs on `billing.plans` and in Vercel environment variables.
5. Configure Paddle client token, API key, and webhook secret in Vercel.
6. Implement checkout opening and a verified raw-body webhook handler.
7. Process subscription create, update, cancel, past-due, refund, and recovery events idempotently through `billing.webhook_events`.
8. Test renewal, failed payment, cancellation, upgrade, downgrade, refund, and webhook replay in Paddle sandbox.
