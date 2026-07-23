# Jamal's Finance Native

True native personal-finance application isolated from the existing Next.js website and from the separate business software roadmap.

## Locked stack

- Android: Kotlin, Jetpack Compose, native Android APIs
- iPhone foundation: Swift, SwiftUI, native Apple APIs
- Shared logic: Kotlin Multiplatform
- Networking: Ktor Client
- Backend: existing Supabase Auth, PostgreSQL, RLS and authenticated RPCs
- Android session and offline cache encryption: AES-GCM keys held by Android Keystore
- Architecture: modular repositories with unidirectional UI state

There is no Chrome, WebView, Trusted Web Activity, or website rendering in this codebase.

## Product boundary

The native app is for personal finance only. Business ERP, inventory, sales, purchases, CRM, tax, banking, budgeting, team management, branches, and company records are intentionally excluded. Those capabilities remain in the website/business codebase and will become separate business software later.

## Safety decision

The development app uses `com.jamalsfinance.app.native.dev`, so it cannot overwrite the currently working TWA app. The production package will switch to `com.jamalsfinance.app` only after complete personal-finance parity, data-isolation tests, permanent signing verification, migration testing, real-device testing, and final visual-parity acceptance.

## Public client configuration

`public.properties` contains only the Supabase project URL and publishable client key. Both values are intended for untrusted client applications and remain protected by Supabase Auth and database Row Level Security.

Never place a service-role key, database password, signing key, Gemini key, or another privileged secret in `public.properties`, `local.properties`, the mobile binary, or GitHub.

For a local non-production override, copy `local.properties.example` to `local.properties`. Local values take precedence and the file is ignored by Git.

## Build

Use JDK 17, Gradle 9.3.1, Android SDK 36, and Build Tools 36.0.0.

```bash
gradle :shared:testAndroidHostTest :androidApp:assembleDebug
```

The same command runs in native CI. A successful run publishes a development-only debug APK artifact from the exact tested commit.

## Current milestone: v0.9.0 Offline Resilience

- Complete personal finance workspaces from v0.1 through v0.8
- Device App Lock, secure-window protection, adaptive layouts and accessibility controls
- Live validated Android connectivity monitoring
- App-wide offline read-only status banner
- Keystore AES-GCM encrypted snapshots in Android no-backup storage
- Per-user cached Accounts & Transactions
- Per-user cached Goals & Payables
- Per-user cached Investments with saved prices
- Thirty-day cache expiry and future-clock/corruption rejection
- Two-minute successful-refresh freshness window
- Automatic network refresh after cached data is restored
- Fail-fast offline behavior rather than long request timeouts
- Offline financial writes are never silently queued
- Shared KMP resilience policy with host tests
- Existing Supabase Auth, RLS, triggers and authenticated RPC boundaries reused

## Offline and data boundary

Offline cache is read-only and scoped to the authenticated user. It does not contain passwords, Supabase tokens, profile images, backup files, reports, AI responses, or any business-software records. Creating or modifying financial records always requires a live authenticated server request.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `9`
- Version name: `0.9.0-offline-resilience`
- Minimum Android: API 23
- Target / compile Android: API 36

## Remaining before production replacement

This is a tested development milestone, not the final Play Store release. Remaining work includes final 1:1 personal-finance visual parity, exhaustive real-device regression testing, production performance profiling, permanent production signing, package migration validation, release AAB generation, and Play Store release checks.
