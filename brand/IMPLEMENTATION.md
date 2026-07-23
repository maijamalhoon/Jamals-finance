# Implementation contract

Application code imports branding through `@/lib/brand`.

Do not import the raw brand manifest directly outside the brand adapter unless a build-time generator needs it. Environment-specific values such as the canonical app URL and support inbox remain environment variables; public product identity remains version-controlled.

A routine public rebrand must not trigger database migrations or package-ID changes.
