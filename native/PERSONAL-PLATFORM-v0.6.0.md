# Jamal's Finance Native v0.6.0 — Personal Platform

This native milestone is intentionally limited to personal finance. Business ERP, inventory, sales, purchases, CRM, tax, team, banking, budgeting, branches, and document modules remain outside the native application and will be developed as separate business software later.

## Included

- Existing native Accounts and Transactions workspace
- Existing native Goals and Payables workspace
- Existing native Investments and Analytics workspace
- Existing native Reports and AI Insights workspace
- Native profile identity and private avatar
- Account-level preferred currency
- Device-level light, dark, and system theme
- Device-level date format and compact spacing
- Goal deadline and payable due alerts
- Persistent notification preferences and read state
- Secure password update and local sign-out
- Complete `.jfinance` export and duplicate-safe restore

## Security and data boundaries

- Uses the current authenticated Supabase session.
- Uses the existing publishable mobile client key only.
- Does not include a service-role key, database password, signing key, or Gemini key.
- Reuses existing RLS-protected tables and authenticated RPC contracts.
- Backup validation is capped at 25 MB and 100,000 personal finance records.
- Avatar uploads are limited to JPG, PNG, or WebP up to 3 MB.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `6`
- Version name: `0.6.0-personal-platform`
- Minimum Android: API 23
- Target / compile Android: API 36

## Verification gate

The milestone is accepted only when both commands pass in the existing hardened native workflow:

```text
gradle :shared:testAndroidHostTest
gradle :androidApp:assembleDebug
```

The uploaded debug APK must come from the same successful workflow run. The final integration is based on the latest protected `main` history so concurrent website and business-software commits remain preserved.
