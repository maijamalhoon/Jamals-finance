# JALVORO Brand System

`brand.config.json` is the single version-controlled source of truth for public platform branding. `brand.config.ts` is a typed runtime wrapper for application imports.

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
- Existing local-storage and installation compatibility keys
- Encryption/storage namespaces
- Export-format compatibility identifiers
- Sentry technical project slug

## Change workflow

1. Edit `brand/brand.config.json`.
2. Replace approved files under `public/brand/` when artwork changes.
3. Run `npm run brand:sync`.
4. Run `npm run check` and `npm run build`.
5. Verify the Vercel preview before merge.

`brand:sync` updates static surfaces that cannot import TypeScript at runtime, including the legacy PWA manifest, offline page, icon accessibility label, and icon tokens.

The current SVG artwork is temporary integration artwork. It proves the replaceable asset contract; it is not the final custom or trademark-approved JALVORO identity.
