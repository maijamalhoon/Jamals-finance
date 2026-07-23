import "server-only";

import { planKeyFromPlanCode } from "./catalog";
import { resolveAccessPlan } from "./entitlements";
import type { PlanKey, SubscriptionStatus } from "./types";
import { createClient } from "@/lib/supabase/server";

export type BillingAccessResult =
  | {
      state: "ready";
      userId: string;
      planKey: PlanKey;
      planCode: string;
      subscriptionStatus: SubscriptionStatus;
      currentPeriodEndsAt: string | null;
      trialEndsAt: string | null;
    }
  | {
      state: "unauthenticated";
      planKey: "free";
    }
  | {
      state: "unavailable";
      planKey: null;
    };

type BillingSnapshot = {
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd?: string | null;
};

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "free",
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
  "incomplete",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return value;
}

function parseBillingSnapshot(value: unknown): BillingSnapshot | null {
  if (!isRecord(value)) return null;

  const planCode = typeof value.planCode === "string" ? value.planCode.trim() : "";
  const status = value.status;
  const trialEndsAt = optionalDate(value.trialEndsAt);
  const currentPeriodEnd = optionalDate(value.currentPeriodEnd);
  const gracePeriodEnd = "gracePeriodEnd" in value
    ? optionalDate(value.gracePeriodEnd)
    : null;

  if (
    !planCode ||
    typeof status !== "string" ||
    !SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus) ||
    trialEndsAt === undefined ||
    currentPeriodEnd === undefined ||
    gracePeriodEnd === undefined
  ) {
    return null;
  }

  return {
    planCode,
    status: status as SubscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    gracePeriodEnd,
  };
}

export async function getCurrentBillingAccess(): Promise<BillingAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { state: "unauthenticated", planKey: "free" };
  }

  const { data, error } = await supabase.rpc("get_my_billing_snapshot");
  if (error) {
    return { state: "unavailable", planKey: null };
  }

  const snapshot = parseBillingSnapshot(data);
  const subscribedPlanKey = snapshot
    ? planKeyFromPlanCode(snapshot.planCode)
    : null;

  if (!snapshot || !subscribedPlanKey) {
    return { state: "unavailable", planKey: null };
  }

  return {
    state: "ready",
    userId: user.id,
    planKey: resolveAccessPlan({
      planKey: subscribedPlanKey,
      status: snapshot.status,
      trialEndsAt: snapshot.trialEndsAt,
      currentPeriodEndsAt: snapshot.currentPeriodEnd,
      gracePeriodEndsAt: snapshot.gracePeriodEnd,
    }),
    planCode: snapshot.planCode,
    subscriptionStatus: snapshot.status,
    currentPeriodEndsAt: snapshot.currentPeriodEnd,
    trialEndsAt: snapshot.trialEndsAt,
  };
}
