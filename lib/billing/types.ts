export type PlanKey = "free" | "go" | "student" | "plus" | "pro";

export type PaidPlanKey = Exclude<PlanKey, "free">;

export type BillingCycle = "monthly" | "annual";

export type PricingTierKey = "A" | "B" | "C" | "D" | "E";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "expired";

export type FeatureKey =
  | "core_tracking"
  | "unlimited_accounts"
  | "recurring_transactions"
  | "csv_export"
  | "advanced_reports"
  | "advanced_analytics"
  | "ai_insights"
  | "forecasting"
  | "priority_support";

export type FeatureAllowance = boolean | number;

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  recommended?: boolean;
  studentOnly?: boolean;
  features: Partial<Record<FeatureKey, FeatureAllowance>>;
};

export type RegionalPrice = {
  monthly: number;
  annual: number;
};

export type RegionalPlanPrices = Record<PaidPlanKey, RegionalPrice>;

export type BillingSubscriptionSnapshot = {
  planKey: PlanKey;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
};
