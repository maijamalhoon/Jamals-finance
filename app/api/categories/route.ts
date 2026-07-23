import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CategoryAction = "create" | "update" | "archive" | "delete";

type CategoryBody = {
  action?: unknown;
  categoryId?: unknown;
  name?: unknown;
  type?: unknown;
  color?: unknown;
  iconKey?: unknown;
  parentId?: unknown;
};

const ERROR_MESSAGES: Record<string, { status: number; message: string }> = {
  authentication_required: { status: 401, message: "Sign in again to continue." },
  request_key_required: { status: 400, message: "The request identifier is missing." },
  category_action_invalid: { status: 400, message: "This category action is not supported." },
  category_id_required: { status: 400, message: "The category identifier is missing." },
  category_name_invalid: { status: 400, message: "Use a category name between 1 and 80 characters." },
  category_type_invalid: { status: 400, message: "Choose Income or Expense." },
  category_color_invalid: { status: 400, message: "Choose a valid category color." },
  category_icon_invalid: { status: 400, message: "Choose a valid category icon." },
  category_duplicate: { status: 409, message: "A category with this name already exists in the selected type." },
  category_parent_invalid: { status: 400, message: "Choose a valid top-level expense parent." },
  category_type_locked: { status: 409, message: "Category type cannot change while transactions or subcategories use it." },
  category_not_found: { status: 404, message: "This category no longer exists." },
  category_in_use: { status: 409, message: "This category has transactions. Archive it instead of deleting it." },
  category_has_children: { status: 409, message: "Move or remove its subcategories before continuing." },
};

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json(
    { error, code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveRpcError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  const code = Object.keys(ERROR_MESSAGES).find((candidate) =>
    normalized.includes(candidate),
  );
  if (!code) {
    return {
      status: 500,
      code: "category_mutation_failed",
      message: "Category change could not be completed. Please try again.",
    };
  }
  return { code, ...ERROR_MESSAGES[code] };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return jsonError(403, "Cross-site category changes are blocked.", "invalid_origin");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return jsonError(403, "Cross-site category changes are blocked.", "cross_site_request_blocked");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError(413, "The category request is too large.", "request_too_large");
  }

  let body: CategoryBody;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return jsonError(413, "The category request is too large.", "request_too_large");
    }
    body = JSON.parse(rawBody) as CategoryBody;
  } catch {
    return jsonError(400, "Send a valid category request.", "invalid_json");
  }

  const action = stringOrNull(body.action) as CategoryAction | null;
  if (!action || !["create", "update", "archive", "delete"].includes(action)) {
    return jsonError(400, "This category action is not supported.", "category_action_invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return jsonError(401, "Sign in again to continue.", "authentication_required");
  }

  const suppliedRequestKey = request.headers.get("x-category-request-key") ?? "";
  const requestKey = UUID_PATTERN.test(suppliedRequestKey)
    ? suppliedRequestKey
    : randomUUID();

  const { data, error } = await supabase.rpc("mutate_personal_category", {
    p_request_key: requestKey,
    p_action: action,
    p_category_id: stringOrNull(body.categoryId),
    p_name: stringOrNull(body.name),
    p_type: stringOrNull(body.type),
    p_color: stringOrNull(body.color),
    p_icon_key: stringOrNull(body.iconKey),
    p_parent_id: stringOrNull(body.parentId),
  });

  if (error) {
    const resolved = resolveRpcError(error.message);
    if (resolved.status >= 500) {
      console.error("Category mutation failed", {
        code: error.code ?? "unknown",
        action,
        userId: user.id,
      });
    }
    return jsonError(resolved.status, resolved.message, resolved.code);
  }

  const result = data as {
    action?: string;
    category?: Record<string, unknown> | null;
  } | null;

  return NextResponse.json(
    { category: result?.category ?? null },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
