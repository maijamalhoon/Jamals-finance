# Jamal's Finance Native v0.9.0 — Offline Resilience

This milestone hardens the personal-finance native app for unstable or unavailable internet connections. It does not add, cache, or import business ERP data.

## Included

- Live Android connectivity monitoring using validated network capabilities
- App-wide offline read-only banner
- Keystore AES-GCM encrypted snapshot files in Android no-backup storage
- User-scoped cache isolation using SHA-256-derived filenames
- Last successful Accounts & Transactions snapshot
- Last successful Goals & Payables snapshot
- Last successful Investments and saved-price snapshot
- Cache schema, age, future-clock and corruption validation
- Thirty-day maximum cache age
- Two-minute successful-refresh freshness window to reduce duplicate requests
- Automatic online refresh after cached content is restored
- Fail-fast offline messages instead of long network timeouts
- Financial writes are never silently queued offline
- Live asset search and market quotes clearly report offline unavailability
- Shared Kotlin Multiplatform resilience policy with host tests

## Safety boundary

Offline mode is deliberately read-only. Creating, editing, deleting, transferring, contributing, repaying, withdrawing, or changing an investment requires an online authenticated request. This prevents duplicate or conflicting financial writes when multiple devices are used.

Cached files are encrypted with a key stored in Android Keystore. They are excluded from Android backups and keyed by authenticated Supabase user ID, preventing one signed-in account from receiving another account's cached snapshot.

Reports, AI responses, profile data, authentication credentials, Supabase tokens, complete backup files, and all business-software records are not placed in the offline snapshot cache.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `9`
- Version name: `0.9.0-offline-resilience`
- Minimum Android: API 23
- Target / compile Android: API 36

## Verification gate

The milestone is accepted only when both commands pass from the same commit:

```text
gradle :shared:testAndroidHostTest
gradle :androidApp:assembleDebug
```

The downloadable APK must be produced by that successful GitHub Actions run. The latest-main integration gate preserves concurrent website, chart, CI, and business-software commits while testing the same verified native source.
