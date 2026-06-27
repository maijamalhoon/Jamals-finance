import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/reset-password",
  "/auth/callback",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
];

const PUBLIC_API_ROUTES = [
  "/api/exchange-rate",
];

const BLOCKED_PRODUCTION_API_ROUTES = [
  "/api/sentry-example-api",
];

function matchesPath(pathname: string, routes: string[]) {
  return routes.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

function jsonUnauthorized() {
  return NextResponse.json(
    {
      error: "Authentication required",
      message: "Please log in before using this API endpoint.",
    },
    { status: 401 }
  );
}

function jsonNotFound() {
  return NextResponse.json(
    {
      error: "Not found",
      message: "This endpoint is not available in production.",
    },
    { status: 404 }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApiRoute = matchesPath(pathname, PUBLIC_API_ROUTES);
  const isPublicPageRoute = matchesPath(pathname, PUBLIC_ROUTES);

  if (
    process.env.NODE_ENV === "production" &&
    matchesPath(pathname, BLOCKED_PRODUCTION_API_ROUTES)
  ) {
    return jsonNotFound();
  }

  if (isPublicApiRoute) {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isApiRoute) {
    return jsonUnauthorized();
  }

  if (!user && !isPublicPageRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
