# Billing and regional pricing foundation

## Product decisions

- Plans: Free, Go, Student, Plus, and Pro.
- A user starts on Free and may explicitly claim one 14-day Pro trial.
- The trial does not require a card and never auto-charges.
- Trial expiry or subscription cancellation changes access; it does not delete finance data.
- Student is a separately verified plan with Plus-level features and controlled AI usage.
- Annual pricing is emphasized in lower-price markets to reduce fixed transaction-fee pressure.

## Regional pricing

The application resolves every ISO country code to one of five commercial pricing tiers. Unlisted countries fall back to the middle Tier C so a missing override does not accidentally charge the highest price. These tiers are a launch pricing policy, not an official economic classification.

The UI displays a USD-equivalent preview. Paddle should remain the checkout source of truth and use automatic currency conversion plus country-specific price overrides. Billing country must be taken from the provider transaction/customer record, not trusted from a client-supplied IP or dropdown.

## Access control

`lib/billing/entitlements.ts` is the deterministic access layer. Product surfaces should call the server-side access decision before executing a paid action. Hiding a button in the browser is not authorization.

Status behavior:

- `trialing`: paid access until `trial_ends_at`.
- `active`: paid access through the current period.
- `past_due`: paid access only during the recorded grace period.
- `canceled`: access continues until the paid period ends.
- `paused` or `expired`: Free access.

## Database security

Authenticated users receive read-only RLS access to their own billing profile, subscriptions, usage, and student-verification result. Browser clients cannot change billing state. Webhook events are not exposed to authenticated users.

`claim_pro_trial(uuid)` is callable only by `service_role`; the API route authenticates the user first and passes the authenticated user ID. The database atomically prevents a second trial.

## Provider launch work still required

1. Complete Paddle business verification.
2. Create products and monthly/annual prices.
3. Add country-specific price overrides.
4. Configure Paddle client token, API key, and webhook secret in Vercel.
5. Implement checkout opening and a verified raw-body webhook handler.
6. Map provider price IDs to plan keys and billing cycles.
7. Process subscription create/update/cancel/past-due events idempotently through `billing_webhook_events`.
8. Test renewal, failed payment, cancellation, upgrade, downgrade, refund, and webhook replay in sandbox.
