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

## Public client configuration

`public.properties` contains only the Supabase project URL and modern publishable client key. Both values are intended for untrusted client applications and remain protected by Supabase Auth and database Row Level Security.

Never place a service-role key, database password, signing key, or other privileged secret in `public.properties`, `local.properties`, the mobile binary, or GitHub.

For a local non-production override, copy `local.properties.example` to `local.properties`. Local values take precedence and the file is ignored by Git.

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
