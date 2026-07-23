# Jamal's Finance Native

True native personal-finance application isolated from the existing Next.js website and from the separate business software roadmap.

## Locked stack

- Android: Kotlin, Jetpack Compose, native Android APIs
- iPhone foundation: Swift, SwiftUI, native Apple APIs
- Shared logic: Kotlin Multiplatform
- Networking: Ktor Client
- Backend: existing Supabase Auth, PostgreSQL, RLS and authenticated RPCs
- Android session storage: AES-GCM key held by Android Keystore
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

## Current milestone: v0.7.0 Privacy & App Lock

- KMP module with Android and iOS targets
- Typed Supabase email/password authentication over Ktor
- Refresh-token restoration and Android Keystore session persistence
- Native Compose login, signup and personal module launcher
- Accounts: load, create, edit, archive, restore and balance ordering
- Transactions: income, expense, transfers, search, filters and deleted history
- Goals: create, edit, delete, contributions, progress and contribution history
- Payables: create, edit, delete, payment recording, repayment history and due status
- Investments: load, search, create, edit, delete, cash out and aggregate repeated purchases
- Live prices for supported crypto, stock and forex assets with safe saved/manual fallback
- Analytics: date presets, previous-period comparisons, refunds, cash flow, categories, accounts and portfolio metrics
- Reports: date ranges, cash flow, categories, sources, account activity, goals, payables and investments
- Native UTF-8 CSV report export through Android's document picker
- AI Insights: financial health, summary cards, suggested actions and authenticated finance chat
- Gemini remains server-side; deterministic finance intelligence is available as fallback
- Native profile name and private profile image
- Account-level preferred currency: PKR, USD, INR, EUR, GBP, JPY and CNY
- Device-level System, Light and Dark themes
- Device-level date format and compact spacing preference
- Goal deadline and payable due alerts using existing personal finance records
- Persistent alert preferences and notification read state
- Secure password update and sign-out
- Complete `.jfinance` export with 25 MB / 100,000-record validation limits
- Duplicate-safe authenticated `.jfinance` restore through the existing import RPC
- Device App Lock using biometrics or Android screen credentials
- Auto-lock timing: immediate, 1, 5, 15 or 30 minutes
- Manual Lock Now control
- Screenshot and recent-app preview protection through Android secure-window flags
- Shared KMP privacy timing policy prepared for future iPhone parity
- Existing RLS, financial triggers and secure RPC boundaries reused

## Privacy boundary

App Lock preferences contain only local protection choices and timing state. They do not contain the user's password, Supabase tokens, finance records, backup contents, or biometric data. Biometric templates and device credentials remain owned and verified by Android.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `7`
- Version name: `0.7.0-privacy-app-lock`
- Minimum Android: API 23
- Target / compile Android: API 36

## Remaining before production replacement

This is a tested development milestone, not the final Play Store release. Remaining work includes final 1:1 personal-finance visual parity, exhaustive real-device regression testing, accessibility and performance hardening, permanent production signing, package migration validation, release AAB generation, and Play Store release checks.
