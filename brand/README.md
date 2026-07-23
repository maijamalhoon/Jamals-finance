# JALVORO Brand System

`brand.config.ts` is the single version-controlled source of truth for public platform branding.

## Editable without data migrations

- Public name and short name
- Tagline and product description
- Product-family labels
- Logo, wordmark, and app-icon paths
- Custom icon-system design tokens

## Stable technical identities

These must not be changed during routine rebrands:

- `internalId` (`jf-platform`)
- Supabase project refs and database identifiers
- Existing user, business, transaction, and accounting IDs
- Android application ID and iOS bundle ID after store publication
- Encryption/storage namespaces
- Export-format compatibility identifiers
- Sentry technical project slug

## Asset workflow

1. Approve a custom JALVORO logo mark and icon family.
2. Replace files under `public/brand/`.
3. Keep paths in `brand.config.ts` stable whenever possible.
4. Run `npm run check:brand` and the normal repository checks.
5. Verify the Vercel preview before merge.

The current production icon is temporary and remains available until the custom JALVORO asset set is approved.
