import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

const shouldUploadSentrySourceMaps =
  process.env.SENTRY_UPLOAD_SOURCE_MAPS === "true" &&
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

const sentryConfig = shouldUploadSentrySourceMaps
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      authToken: process.env.SENTRY_AUTH_TOKEN!,

      // Upload a wider set of source maps only when Sentry env vars are ready.
      widenClientFileUpload: true,

      // Keep Vercel build logs clean.
      silent: true,
      telemetry: false,
    })
  : nextConfig;

export default sentryConfig;