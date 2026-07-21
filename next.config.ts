import type { NextConfig } from "next";

function safeOrigin(value: string | undefined, fallback: string) {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}

const supabaseOrigin = safeOrigin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://tdagzmgcgjlyqzegmizg.supabase.co",
);
const supabaseWebSocketOrigin = supabaseOrigin.replace(/^http/, "ws");
const productionScriptSources = ["'self'", "'unsafe-inline'"];
const scriptSources =
  process.env.NODE_ENV === "production"
    ? productionScriptSources
    : [...productionScriptSources, "'unsafe-eval'"];

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  [
    "img-src 'self' data: blob:",
    "https://coin-images.coingecko.com",
    "https://www.google.com",
    "https://commons.wikimedia.org",
    "https://upload.wikimedia.org",
    "https://*.googleusercontent.com",
    "https://avatars.githubusercontent.com",
    "https://*.supabase.co",
  ].join(" "),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSources.join(" ")}`,
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseWebSocketOrigin,
    "https://*.ingest.sentry.io",
  ].join(" "),
  "frame-src 'none'",
  "child-src 'self' blob:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const privateNoStoreHeaders = [
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate",
  },
  {
    key: "CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "Vercel-CDN-Cache-Control",
    value: "no-store",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/onboarding",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/reset-password",
        headers: privateNoStoreHeaders,
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
