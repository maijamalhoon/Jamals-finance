# Jamal's Finance Android TWA

This directory stores the reproducible Trusted Web Activity configuration for the Android package.

- Package ID: `com.jamalsfinance.app`
- Production host: `jamals-finance-sable.vercel.app`
- Signing keys and passwords must never be committed.
- Website UI, data, calculations, and application logic remain owned by the existing web project.

Normal website deployments are loaded by the Android wrapper without rebuilding the APK. Rebuild the Android package only when native wrapper configuration, package metadata, permissions, or Android publishing requirements change.
