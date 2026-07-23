import type {
  BillingCycle,
  BusinessPlanKey,
  PricedBusinessPlanKey,
} from "./types";

const SELF_SERVE_BUSINESS_PLANS = new Set<PricedBusinessPlanKey>([
  "solo",
  "starter",
  "growth",
  "scale",
]);

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

export function isBusinessPlanKey(value: unknown): value is BusinessPlanKey {
  return (
    value === "business_free" ||
    value === "solo" ||
    value === "starter" ||
    value === "growth" ||
    value === "scale" ||
    value === "enterprise"
  );
}

export function isSelfServeBusinessPlan(
  value: BusinessPlanKey,
): value is PricedBusinessPlanKey {
  return SELF_SERVE_BUSINESS_PLANS.has(value as PricedBusinessPlanKey);
}

export function businessPlanCode(
  plan: PricedBusinessPlanKey,
  cycle: BillingCycle,
): string {
  return `${plan}_${cycle === "annual" ? "year" : "month"}`;
}
