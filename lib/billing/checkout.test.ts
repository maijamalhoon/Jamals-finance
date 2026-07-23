import { describe, expect, it } from "vitest";

import {
  businessPlanCode,
  isBillingCycle,
  isBusinessPlanKey,
  isSelfServeBusinessPlan,
} from "./checkout";

describe("business checkout validation", () => {
  it("accepts only supported billing cycles", () => {
    expect(isBillingCycle("monthly")).toBe(true);
    expect(isBillingCycle("annual")).toBe(true);
    expect(isBillingCycle("weekly")).toBe(false);
  });

  it("recognizes every business plan key", () => {
    for (const plan of [
      "business_free",
      "solo",
      "starter",
      "growth",
      "scale",
      "enterprise",
    ]) {
      expect(isBusinessPlanKey(plan)).toBe(true);
    }
    expect(isBusinessPlanKey("pro")).toBe(false);
  });

  it("keeps Free and Enterprise out of self-service checkout", () => {
    expect(isSelfServeBusinessPlan("business_free")).toBe(false);
    expect(isSelfServeBusinessPlan("enterprise")).toBe(false);
    expect(isSelfServeBusinessPlan("solo")).toBe(true);
    expect(isSelfServeBusinessPlan("growth")).toBe(true);
  });

  it("maps plan and cycle to stable provider-neutral codes", () => {
    expect(businessPlanCode("solo", "monthly")).toBe("solo_month");
    expect(businessPlanCode("starter", "annual")).toBe("starter_year");
    expect(businessPlanCode("scale", "annual")).toBe("scale_year");
  });
});
