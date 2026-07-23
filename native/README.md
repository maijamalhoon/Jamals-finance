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

## Package safety

- Debug: `com.jamalsfinance.app.native.dev`
- Release candidate: `com.jamalsfinance.app.native.rc`
- Existing TWA identity: `com.jamalsfinance.app`

The release candidate remains separately installable and cannot overwrite the working TWA application. The canonical package changes only after permanent-signing continuity, migration behavior and the complete device matrix are accepted.

## Public client configuration

`public.properties` contains only the Supabase project URL and publishable client key. Both values are intended for untrusted client applications and remain protected by Supabase Auth and database Row Level Security.

Never place a service-role key, database password, signing key, Gemini key, or another privileged secret in `public.properties`, `local.properties`, the mobile binary, or GitHub.

For a local non-production override, copy `local.properties.example` to `local.properties`. Local values take precedence and the file is ignored by Git.

## Release signing

The keystore and passwords are never committed. Release signing activates only when the existing permanent signing inputs are supplied through local properties or protected CI environment variables. An unsigned AAB is valid for compile, lint, R8 and bundle verification, but it is not a Play Store production artifact.

## Build

Use JDK 17, Gradle 9.3.1, Android SDK 36, and Build Tools 36.0.0.

```bash
gradle :shared:testAndroidHostTest :androidApp:lintDebug :androidApp:lintRelease :androidApp:assembleDebug :androidApp:bundleRelease
bash scripts/verify-release-artifacts.sh
```

A successful native CI run publishes the debug APK, minified release-candidate AAB, R8 mapping and SHA-256 artifact manifest from the exact tested commit.

## Current milestone: v1.0.0-rc1 Release Candidate

- Complete personal-finance workspaces from v0.1 through v0.9
- App Lock, secure-window protection, adaptive layouts and accessibility controls
- Encrypted read-only offline resilience for core finance modules
- Release-candidate package isolated from the existing TWA
- R8 code optimization and obfuscation
- Android resource shrinking
- Cleartext HTTP disabled
- Debug-only StrictMode runtime diagnostics
- Debug and release lint gates
- Debug APK and release AAB from one CI commit
- APK, AAB and mapping SHA-256 manifest
- Existing permanent-key secrets-aware release signing path
- Explicit physical-device, Play Console and package-migration checklist

## Build identity

- Debug package: `com.jamalsfinance.app.native.dev`
- RC package: `com.jamalsfinance.app.native.rc`
- Version code: `10`
- Version name: `1.0.0-rc1`
- Minimum Android: API 23
- Target / compile Android: API 36

## Remaining before public production replacement

This is a release candidate, not automatic authorization to replace the live TWA package. Remaining external acceptance requires the expected permanent signing certificate, signed AAB verification, physical-device regression testing, Play Console pre-launch results and explicit canonical-package migration approval. See `RELEASE-CANDIDATE-v1.0.0.md`.
