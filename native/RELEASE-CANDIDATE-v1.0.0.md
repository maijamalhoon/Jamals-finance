# Jamal's Finance Native v1.0.0-rc1 — Release Candidate

This release candidate packages the completed personal-finance native application for final installation, performance, signing and Play Store validation. Business ERP functionality remains excluded.

## Build identities

- Debug application ID: `com.jamalsfinance.app.native.dev`
- Release-candidate application ID: `com.jamalsfinance.app.native.rc`
- Version code: `10`
- Version name: `1.0.0-rc1`
- Minimum Android: API 23
- Target / compile Android: API 36

The RC package deliberately does not claim the existing `com.jamalsfinance.app` identity. That identity is currently associated with the working TWA release and must not be overwritten until migration and permanent-signing continuity are approved.

## Release hardening

- R8 code optimization and obfuscation
- Android resource shrinking
- Release build is non-debuggable
- Cleartext HTTP disabled in the manifest
- Android backup remains disabled
- Debug-only StrictMode diagnostics for disk, network and resource leaks
- Debug APK signature validation
- Release AAB archive, size and strict JAR-signature validation
- Expected permanent certificate fingerprint validation
- SHA-256 manifest for APK, AAB and R8 mapping file
- Lint, shared KMP tests, debug APK and release AAB built from one commit

## Permanent signing boundary

The project never commits a keystore or passwords. Release signing activates only when all existing permanent-key inputs are supplied securely:

- `JAMALS_ANDROID_KEYSTORE_PATH`
- `JAMALS_ANDROID_STORE_PASSWORD`
- `JAMALS_ANDROID_KEY_ALIAS`
- `JAMALS_ANDROID_KEY_PASSWORD`

GitHub Actions may construct the keystore path from the encrypted `JAMALS_ANDROID_KEYSTORE_BASE64` secret. If those secrets are unavailable, CI still produces an unsigned RC AAB for compile, R8, lint and bundle validation. It must not be uploaded to Play Console as a production release.

Expected permanent upload certificate SHA-256:

`2F:7F:D9:B0:1F:59:F7:FB:A0:93:3F:55:AA:F2:AF:FB:8A:B2:72:1E:B3:97:02:17:B8:5F:66:8E:9A:CD:AE:40`

A signed RC with any other certificate fails artifact verification. Do not generate a replacement signing identity merely to make CI green.

## Required device matrix before production migration

- API 23–25 physical phone
- API 26–28 physical phone
- API 29–32 physical phone
- API 33–36 physical phone
- One Samsung device
- One Xiaomi/Redmi or other aggressively managed Android device
- One tablet or foldable large-window test
- Light, dark and high-contrast themes
- 100%, 125%, 150% and 200% font scaling
- TalkBack navigation
- Biometric and device-credential app lock
- Airplane-mode cached startup and reconnect refresh
- Rotation, split screen and process recreation
- `.jfinance` export and duplicate-safe restore
- Fresh install, upgrade from v0.9 debug data, sign-out and account switch

## Production migration gate

The canonical package migration is approved only after:

1. The permanent signing certificate fingerprint matches the expected certificate.
2. A signed RC AAB passes `jarsigner -verify -strict` and the certificate check.
3. All personal workspaces pass the device matrix without data loss.
4. Play Console pre-launch report has no blocking crashes, ANRs or security findings.
5. TWA replacement and user migration behavior are explicitly accepted.
6. Final package changes from `.native.rc` to the approved production identity in one reviewed release commit.

## CI acceptance command

```text
gradle :shared:testAndroidHostTest :androidApp:lintDebug :androidApp:lintRelease :androidApp:assembleDebug :androidApp:bundleRelease
bash scripts/verify-release-artifacts.sh
```

The release candidate is accepted only when both commands pass from the same commit and the downloadable artifacts come from that successful GitHub Actions run. Clean integration verification uses the latest `main` tree and excludes temporary branch status or log commits.
