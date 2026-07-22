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

The development app uses `com.jamalsfinance.app.native.dev`, so it cannot overwrite the currently working TWA app. The production package will switch to `com.jamalsfinance.app` only after feature parity, data-isolation tests, signing-key verification, and migration testing pass.

## Configure Android

Copy `local.properties.example` to `local.properties` and enter only the public Supabase URL and publishable/anon client key. Never add a service-role key.

## Build

Use JDK 17, Gradle 9.3.1, Android SDK 36 and Build Tools 36.0.0.

```bash
gradle :shared:testAndroidHostTest :androidApp:assembleDebug
```

The same command runs in `Native foundation CI`. A successful run publishes a development-only debug APK artifact for validation.

## Current milestone

- KMP module with Android and iOS targets
- Typed Supabase email/password auth over Ktor
- Refresh-token restoration
- Secure Android Keystore session persistence
- Native Compose login/signup shell
- Native SwiftUI iOS shell
- No finance feature parity claimed yet
