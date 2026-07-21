import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function readPathFromAvatarUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = new URL(value, "https://jamals-finance.local");
    if (parsed.pathname === "/api/profile/avatar") {
      return parsed.searchParams.get("path");
    }
  } catch {
    return null;
  }

  for (const marker of [
    "/storage/v1/object/public/avatars/",
    "/storage/v1/object/authenticated/avatars/",
  ]) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      return value.slice(markerIndex + marker.length).split(/[?#]/, 1)[0] ?? null;
    }
  }

  return null;
}

function validateOwnedAvatarPath(value: unknown, userId: string) {
  if (typeof value !== "string") return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value).replace(/^\/+/, "");
  } catch {
    return null;
  }

  if (decoded.length > 180 || decoded.includes("\\") || decoded.includes("..")) {
    return null;
  }

  const match = decoded.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/profile\.(jpe?g|png|webp)$/i,
  );
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) return null;

  return decoded;
}

function contentTypeForPath(path: string, blobType: string) {
  if (ALLOWED_CONTENT_TYPES.has(blobType)) return blobType;
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.webp$/i.test(path)) return "image/webp";
  return "image/jpeg";
}

function privateError(status: 401 | 404) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Avatar not found",
      code: status === 401 ? "authentication_required" : "avatar_not_found",
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return privateError(401);

  const metadata = user.user_metadata ?? {};
  const requestedPath =
    request.nextUrl.searchParams.get("path") ??
    (typeof metadata.avatar_path === "string" ? metadata.avatar_path : null) ??
    readPathFromAvatarUrl(metadata.avatar_url);
  const path = validateOwnedAvatarPath(requestedPath, user.id);
  if (!path) return privateError(404);

  const { data: avatar, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .download(path);
  if (error || !avatar || avatar.size <= 0 || avatar.size > MAX_AVATAR_BYTES) {
    return privateError(404);
  }

  const body = await avatar.arrayBuffer();
  const filename = path.slice(path.lastIndexOf("/") + 1);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "Content-Type": contentTypeForPath(path, avatar.type),
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `inline; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      Vary: "Cookie, Authorization",
    },
  });
}
