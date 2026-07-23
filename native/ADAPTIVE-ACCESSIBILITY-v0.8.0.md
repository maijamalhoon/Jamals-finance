# Jamal's Finance Native v0.8.0 — Adaptive Accessibility

This milestone improves the personal-finance native app for phones, tablets, large text, TalkBack, and high-contrast use. It does not add or import business ERP functionality.

## Included

- Shared Kotlin Multiplatform adaptive layout policy with host tests
- Single-column phone layout
- Two-column tablet and large-window launcher layout
- Automatic single-column fallback above 125% Android font scaling
- Full-card workspace touch targets
- TalkBack-friendly grouped module descriptions
- Heading semantics for important screen titles
- Live announcements for login errors, configuration errors, and secure-session loading
- Opt-in high-contrast light and dark themes
- Device-local Accessibility & Display workspace
- Direct shortcut to Android accessibility settings
- Existing compact spacing preference exposed in the accessibility workspace

## Data boundary

Accessibility preferences remain on the Android device. They do not alter Supabase finance rows, authentication credentials, RLS policies, backups, business modules, or website settings.

## Build identity

- Package: `com.jamalsfinance.app.native.dev`
- Version code: `8`
- Version name: `0.8.0-adaptive-accessibility`
- Minimum Android: API 23
- Target / compile Android: API 36

## Verification gate

The milestone is accepted only when both commands pass from the same commit:

```text
gradle :shared:testAndroidHostTest
gradle :androidApp:assembleDebug
```

The downloadable APK must be produced by that successful GitHub Actions run.
