# JALVORO Admin Control Center

Private platform dashboard at `/admin` for aggregate product, billing, telemetry, and performance reporting.

## Security model

- The page requires an authenticated Supabase session.
- Platform access is granted through `private.platform_admins` by user UUID.
- Unauthorized accounts receive the application not-found response.
- Browser roles cannot read `private.platform_admins`, `billing.*`, or the admin access log directly.
- The public RPC is `SECURITY INVOKER`; its privileged implementation stays inside the private schema and rechecks `auth.uid()`.
- Every successful control-center snapshot writes a 12-month admin access audit entry.
- The snapshot contains aggregate counts only. It does not return user emails, names, finance records, amounts, notes, raw IP addresses, payment-card details, or webhook payloads.

## Grant the first owner

Run this only through a trusted database administration channel after confirming the exact Supabase Auth user UUID:

```sql
insert into private.platform_admins (user_id, role)
values ('<confirmed-auth-user-uuid>', 'owner')
on conflict (user_id) do update
set role = excluded.role,
    disabled_at = null;
```

Do not place an email address or generated user UUID in a migration. Production administrator grants are deployment-specific operational data.

## Billing model

The `billing` schema is provider-neutral and supports Stripe, Paddle, or a future provider.

- `billing.plans`: free and paid commercial plan definitions
- `billing.customers`: server-only provider customer references
- `billing.subscriptions`: one current subscription state per account
- `billing.webhook_events`: provider event idempotency with SHA-256 payload hashes only

Existing users are backfilled to the `free` plan. New authenticated users receive a free subscription through a fail-open Auth trigger so billing initialization can never block account creation.

## Unlimited features

Plans classify commercial status only. There is no feature-limit column, feature-gating table, or entitlement quota in this foundation. Free, trial, and paid counts can be reported without disabling the existing finance experience.

## Performance rules

- `/admin` is a Server Component.
- It makes one aggregate RPC request.
- It does not load Recharts, live polling, session replay, or a client analytics dashboard.
- Lists are capped at the highest-value routes, countries, and device groups.
- Foreign keys used by reporting and audit cleanup have covering indexes.

## Payment provider integration checklist

1. Add real paid plan rows using the provider's confirmed price configuration.
2. Verify webhook signatures before reading or processing an event.
3. Store the provider event ID and payload SHA-256 hash before mutation.
4. Update `billing.customers` and `billing.subscriptions` server-side only.
5. Never store card number, CVV, banking password, or raw webhook payload.
6. Make webhook processing idempotent using `(provider, provider_event_id)`.
7. Keep payment failure separate from the core finance workspace.
8. Validate free, trial, active, past-due, cancelled, and expired reporting in Preview before Production.
