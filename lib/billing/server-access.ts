import "server-only";

import { resolveAccessPlan } from "./entitlements";
import type { PlanKey, SubscriptionStatus } from "./types";
import { createClient } from "@/lib/supabase/server";

export type BillingAccessResult =
  | {
      state: "ready";
      userId: string;
      planKey: PlanKey;
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

type SubscriptionRow = {
  plan_key: PlanKey;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  grace_period_ends_at: string | null;
};

export async function getCurrentBillingAccess(): Promise<BillingAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { state: "unauthenticated", planKey: "free" };
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("plan_key,status,trial_ends_at,current_period_ends_at,grace_period_ends_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { state: "unavailable", planKey: null };
  }

  const subscription = data as SubscriptionRow | null;

  if (!subscription) {
    return {
      state: "ready",
      userId: user.id,
      planKey: "free",
      subscriptionStatus: "free",
      currentPeriodEndsAt: null,
      trialEndsAt: null,
    };
  }

  return {
    state: "ready",
    userId: user.id,
    planKey: resolveAccessPlan({
      planKey: subscription.plan_key,
      status: subscription.status,
      trialEndsAt: subscription.trial_ends_at,
      currentPeriodEndsAt: subscription.current_period_ends_at,
      gracePeriodEndsAt: subscription.grace_period_ends_at,
    }),
    subscriptionStatus: subscription.status,
    currentPeriodEndsAt: subscription.current_period_ends_at,
    trialEndsAt: subscription.trial_ends_at,
  };
}
