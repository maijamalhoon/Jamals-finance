import { NextResponse } from "next/server";

import {
  businessPlanCode,
  isBillingCycle,
  isBusinessPlanKey,
  isSelfServeBusinessPlan,
} from "@/lib/billing/checkout";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreJson(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid checkout request." }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return noStoreJson({ error: "Invalid checkout request." }, 400);
  }

  const record = body as Record<string, unknown>;
  const businessId = record.businessId;
  const plan = record.plan;
  const cycle = record.cycle;

  if (typeof businessId !== "string" || !UUID_PATTERN.test(businessId)) {
    return noStoreJson({ error: "Invalid business ID." }, 400);
  }

  if (!isBusinessPlanKey(plan) || !isSelfServeBusinessPlan(plan)) {
    return noStoreJson({ error: "This plan is not available for self-service checkout." }, 400);
  }

  if (!isBillingCycle(cycle)) {
    return noStoreJson({ error: "Invalid billing cycle." }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return noStoreJson({ error: "Authentication required." }, 401);
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id,owner_user_id,status")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    return noStoreJson({ error: "Business workspace not found." }, 404);
  }

  if (business.owner_user_id !== user.id) {
    return noStoreJson(
      { error: "Only the business owner can change its subscription." },
      403,
    );
  }

  if (business.status !== "active") {
    return noStoreJson(
      { error: "This business workspace is not active." },
      409,
    );
  }

  const checkoutEnabled = process.env.BILLING_CHECKOUT_ENABLED === "true";
  const paddleConfigured = Boolean(
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
      process.env.PADDLE_API_KEY &&
      process.env.PADDLE_WEBHOOK_SECRET,
  );

  if (!checkoutEnabled || !paddleConfigured) {
    return noStoreJson(
      {
        error:
          "Secure checkout is not active yet. Continue Free remains available and no payment was attempted.",
      },
      503,
    );
  }

  return noStoreJson(
    {
      error: `Provider checkout adapter is not connected for ${businessPlanCode(
        plan,
        cycle,
      )}.`,
    },
    501,
  );
}
