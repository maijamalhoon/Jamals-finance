import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  const shouldRewriteAIChat =
    request.method === "POST" &&
    request.nextUrl.pathname === "/api/ai-insights" &&
    sessionResponse.headers.get("x-middleware-next") === "1";

  if (!shouldRewriteAIChat) return sessionResponse;

  const destination = request.nextUrl.clone();
  destination.pathname = "/api/ai-insights/exact";

  const rewriteResponse = NextResponse.rewrite(destination);

  for (const cookie of sessionResponse.cookies.getAll()) {
    rewriteResponse.cookies.set(cookie);
  }

  for (const headerName of ["cache-control", "expires", "pragma", "vary"]) {
    const value = sessionResponse.headers.get(headerName);
    if (value !== null) rewriteResponse.headers.set(headerName, value);
  }

  return rewriteResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|android-release\\.json|\\.well-known(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
