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

## Current milestone: v0.8.0 Adaptive Accessibility

- Complete personal finance workspaces from v0.1 through v0.7
- Device App Lock, secure-window protection and local privacy controls
- Shared KMP adaptive layout policy with host tests
- Single-column phone launcher
- Two-column tablet and large-window launcher
- Automatic one-column fallback above 125% Android font scaling
- Full-card workspace touch targets
- TalkBack grouped module descriptions and heading semantics
- Live announcements for login errors, configuration errors and session restoration
- Opt-in high-contrast light and dark themes
- Device-local Accessibility & Display workspace
- Android accessibility settings shortcut
- Existing compact spacing preference available from the accessibility workspace
- Existing RLS, financial triggers and secure RPC boundaries reused

## Accessibility and data boundary

Accessibility and display choices stay on the Android device. They do not contain passwords, Supabase tokens, finance records, backup contents, biometric data, or business data. Android remains responsible for TalkBack, font scaling, screen credentials and accessibility services.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `8`
- Version name: `0.8.0-adaptive-accessibility`
- Minimum Android: API 23
- Target / compile Android: API 36

## Remaining before production replacement

This is a tested development milestone, not the final Play Store release. Remaining work includes final 1:1 personal-finance visual parity, exhaustive real-device regression testing, performance hardening, permanent production signing, package migration validation, release AAB generation, and Play Store release checks.
