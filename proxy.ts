import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PAGE_ROUTES = [
  "/",
  "/login",
  "/reset-password",
  "/auth/callback",
];

const AUTH_ONLY_PAGE_ROUTES = ["/", "/login"];

const PUBLIC_ASSET_ROUTES = [
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
  "/offline.html",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
];

const PUBLIC_ASSET_PREFIXES = ["/icons/"];
const PUBLIC_API_ROUTES = ["/api/exchange-rate"];
const BLOCKED_PRODUCTION_API_ROUTES = ["/api/sentry-example-api"];

function matchesPath(pathname: string, routes: string[]) {
  return routes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function jsonUnauthorized() {
  return NextResponse.json(
    {
      error: "Authentication required",
      message: "Please log in before using this API endpoint.",
    },
    { status: 401 },
  );
}

function jsonNotFound() {
  return NextResponse.json(
    {
      error: "Not found",
      message: "This endpoint is not available in production.",
    },
    { status: 404 },
  );
}

function getOriginalPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("auth-token");
}

function clearStaleAuthCookies(
  response: NextResponse,
  request: NextRequest,
) {
  request.cookies
    .getAll()
    .filter(({ name }) => isSupabaseAuthCookie(name))
    .forEach(({ name }) => {
      response.cookies.set({
        name,
        value: "",
        path: "/",
        expires: new Date(0),
        maxAge: 0,
        sameSite: "lax",
      });
    });

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApiRoute = matchesPath(pathname, PUBLIC_API_ROUTES);
  const isPublicPageRoute = matchesPath(pathname, PUBLIC_PAGE_ROUTES);
  const isPublicAssetRoute =
    matchesPath(pathname, PUBLIC_ASSET_ROUTES) ||
    matchesPrefix(pathname, PUBLIC_ASSET_PREFIXES);

  if (
    process.env.NODE_ENV === "production" &&
    matchesPath(pathname, BLOCKED_PRODUCTION_API_ROUTES)
  ) {
    return jsonNotFound();
  }

  if (isPublicApiRoute || isPublicAssetRoute) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  let user = null;
  let authSessionInvalid = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    authSessionInvalid = Boolean(error && !data.user);
  } catch {
    authSessionInvalid = true;
  }

  if (!user && isApiRoute) {
    const response = jsonUnauthorized();
    return authSessionInvalid
      ? clearStaleAuthCookies(response, request)
      : response;
  }

  if (!user && !isPublicPageRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", getOriginalPath(request));

    const response = NextResponse.redirect(url);
    return authSessionInvalid
      ? clearStaleAuthCookies(response, request)
      : response;
  }

  if (user && matchesPath(pathname, AUTH_ONLY_PAGE_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return authSessionInvalid
    ? clearStaleAuthCookies(supabaseResponse, request)
    : supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
