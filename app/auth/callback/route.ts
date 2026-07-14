import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyAuthFailure, sanitizeInternalRedirect } from "@/lib/supabase/session";

function privateRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeInternalRedirect(requestUrl.searchParams.get("next"));

  if (!code) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("reason", "callback_failed");
    loginUrl.searchParams.set("next", next);
    return privateRedirect(loginUrl);
  }

  const supabase = await createClient();
  let exchangeError: unknown = null;

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error;
  } catch (error) {
    exchangeError = error;
  }

  if (exchangeError) {
    const loginUrl = new URL("/login", requestUrl.origin);
    const failure = classifyAuthFailure(exchangeError, true);
    loginUrl.searchParams.set(
      "reason",
      failure === "transient_failure" ? "auth_unavailable" : "callback_failed",
    );
    loginUrl.searchParams.set("next", next);
    return privateRedirect(loginUrl);
  }

  return privateRedirect(new URL(next, requestUrl.origin));
}
