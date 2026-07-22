# Jamal's Finance Native

Native-first mobile workspace isolated from the existing Next.js website.

## Locked stack

- Android: Kotlin, Jetpack Compose, native Android APIs
- iPhone: Swift, SwiftUI, native Apple APIs
- Shared logic: Kotlin Multiplatform
- Networking: Ktor Client
- Backend: existing Supabase Auth/Postgres/RLS
- Android session storage: AES-GCM key held by Android Keystore
- Architecture direction: modular clean architecture + unidirectional state

There is no Chrome, WebView, Trusted Web Activity, or website rendering in this codebase.

## Safety decision

The development app uses `com.jamalsfinance.app.native.dev`, so it cannot overwrite the currently working TWA app. The production package will switch to `com.jamalsfinance.app` only after feature parity, data-isolation tests, signing-key verification, migration testing, and final visual-parity acceptance pass.

## Public client configuration

`public.properties` contains only the Supabase project URL and modern publishable client key. Both values are intended for untrusted client applications and remain protected by Supabase Auth and database Row Level Security.

Never place a service-role key, database password, signing key, Gemini key, or other privileged secret in `public.properties`, `local.properties`, the mobile binary, or GitHub.

For a local non-production override, copy `local.properties.example` to `local.properties`. Local values take precedence and the file is ignored by Git.

## Build

Use JDK 17, Gradle 9.3.1, Android SDK 36 and Build Tools 36.0.0.

```bash
gradle :shared:testAndroidHostTest :androidApp:assembleDebug
```

The same command runs in native CI. A successful run publishes a development-only debug APK artifact for validation.

## Current milestone: v0.5.0

- KMP module with Android and iOS targets
- Typed Supabase email/password auth over Ktor
- Refresh-token restoration
- Secure Android Keystore session persistence
- Native Compose login/signup and module launcher
- Accounts: load, create, edit, archive, restore and balance ordering
- Transactions: income, expense, transfers, search, filters and deleted history
- Goals: create, edit, delete, contributions, progress and contribution history
- Payables: create, edit, delete, payment recording, repayment history and due status
- Investments: load, search, create, edit, delete, cash out and aggregate repeated purchases
- Live investment prices for supported crypto, stock and forex assets with safe manual fallback
- Analytics: aligned date presets, previous-period comparisons, refunds, cash flow, categories, accounts and portfolio metrics
- Reports: week, month, six-month, year and custom ranges with refund-aware totals
- Reports: cash flow, categories, sources, account activity, goals, payables and investments
- Native UTF-8 CSV report export through Android's document picker
- AI Insights: financial health, summary cards, insights, actions and finance chat
- Gemini remains server-side; secure deterministic finance intelligence is used as fallback
- Original-currency metadata with PKR canonical values
- Existing database RLS, secure RPCs and financial triggers reused

## Not complete yet

This development milestone is not the final Play Store replacement and does not claim complete finance-feature parity or final 1:1 website visual parity. Business modules, notifications, remaining platform integrations, release hardening and dedicated visual-parity work remain future milestones.
