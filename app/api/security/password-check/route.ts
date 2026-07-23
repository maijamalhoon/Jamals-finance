import { NextResponse } from "next/server";

import { validatePasswordPolicy } from "@/lib/auth/password-policy";
import { getPwnedPasswordCount } from "@/lib/auth/pwned-passwords.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const MAX_REQUEST_BYTES = 2_048;
const RATE_WINDOW_MS = 60_000;
const MAX_CHECKS_PER_WINDOW = 30;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_CHECKS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function isSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ code: "forbidden" }, 403);
  }

  const rateLimit = consumeRateLimit(request);
  if (!rateLimit.allowed) {
    return jsonResponse(
      { code: "too_many_password_checks" },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ code: "invalid_request" }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse({ code: "invalid_request" }, 400);
  }

  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
    return jsonResponse({ code: "invalid_request" }, 400);
  }

  let password: unknown;
  try {
    password = (JSON.parse(rawBody) as { password?: unknown }).password;
  } catch {
    return jsonResponse({ code: "invalid_request" }, 400);
  }

  if (typeof password !== "string") {
    return jsonResponse({ code: "invalid_request" }, 400);
  }

  const localPolicy = validatePasswordPolicy(password);
  if (!localPolicy.ok) {
    return jsonResponse(
      { code: "password_policy_failed", message: localPolicy.error },
      422,
    );
  }

  try {
    const exposureCount = await getPwnedPasswordCount(password);
    if (exposureCount > 0) {
      return jsonResponse({ safe: false, code: "password_compromised" }, 409);
    }

    return jsonResponse({ safe: true }, 200);
  } catch {
    return jsonResponse({ code: "password_check_unavailable" }, 503);
  }
}
