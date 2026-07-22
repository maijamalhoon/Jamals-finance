# iOS host

The SwiftUI host sources are intentionally separate from the KMP shared logic. Create/open the Xcode host on macOS, link the generated `JamalsFinanceShared.framework`, configure the bundle identifier, associated domains, Keychain access, and Supabase mobile redirect URL.

The Linux/Android CI validates shared common logic and Android. An Xcode project and signed iOS build require macOS + Xcode + an Apple Developer account; no fake iOS build is claimed from Linux.
