# Jamal's Finance Native v0.7.0 — Privacy & App Lock

This milestone adds device-level privacy protection to the existing personal-finance native app. It does not add or import any business ERP functionality.

## Included

- App-wide lock gate for authenticated personal finance content
- Android biometric authentication on supported Android 9+ devices
- Android device PIN, pattern, or password fallback
- Device credential authentication on Android 6–8 devices
- Auto-lock immediately or after 1, 5, 15, or 30 minutes
- Manual Lock Now control
- Screenshot and recent-app preview blocking through `FLAG_SECURE`
- Device security availability checks before App Lock can be enabled
- Shared Kotlin Multiplatform timeout policy with host tests

## Fail-closed behavior

- A fresh process launch requires authentication when App Lock is enabled.
- Clock rollback or invalid timing state requires authentication.
- Cancelled or failed authentication leaves finance content locked.
- App Lock cannot be enabled until Android has a secure screen credential.
- Biometric templates and device credentials are never read or stored by Jamal's Finance.

## Local storage boundary

The local preference store contains only theme, date format, compact mode, App Lock enabled state, timeout choice, screenshot-protection choice, and the last background timestamp. It does not contain passwords, biometric data, Supabase access tokens, finance rows, or backup contents.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `7`
- Version name: `0.7.0-privacy-app-lock`
- Minimum Android: API 23
- Target / compile Android: API 36

## Verification gate

The milestone is accepted only when both commands pass from the same commit:

```text
gradle :shared:testAndroidHostTest
gradle :androidApp:assembleDebug
```

The APK artifact must be produced by that successful GitHub Actions run. The integration verification is based on the latest main tree and preserves all concurrent dashboard, approvals, and business software commits.
