# Android Release Identity

## Version 1

- Package ID: `com.jamalsfinance.app`
- App version name: `1.0.0.0`
- App version code: `1`
- Minimum SDK: `23` (Android 6)
- Compile SDK: `36`
- Target SDK: `36`
- Production origin: `https://jamals-finance-sable.vercel.app`
- Certificate SHA-256: `2F:7F:D9:B0:1F:59:F7:FB:A0:93:3F:55:AA:F2:AF:FB:8A:B2:72:1E:B3:97:02:17:B8:5F:66:8E:9A:CD:AE:40`

The APK is aligned and signed with APK Signature Schemes v1, v2, and v3. The AAB is signed with the same upload certificate.

## Future release rules

1. Keep the package ID unchanged.
2. Sign every APK/AAB update with the same private signing key.
3. Increase `versionCode` for every native Android release.
4. Keep the production origin and `/.well-known/assetlinks.json` certificate association valid.
5. Normal web UI and logic deployments do not require a new Android package; rebuild only for native wrapper, package metadata, permissions, SDK, or store-policy changes.
6. Never commit signing keys or passwords.
