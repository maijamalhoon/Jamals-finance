import { describe, expect, it } from "vitest";

import {
  localizeVerifiedFinanceAnswer,
  localizeVerifiedFinanceText,
} from "@/lib/ai/localized-finance-answer";

describe("localized verified finance answers", () => {
  it("keeps verified values and adds the profile name", () => {
    const result = localizeVerifiedFinanceAnswer({
      language: "ur",
      displayName: "Jamal",
      result: {
        answer:
          "You spent PKR 12,500 during this month, across 4 recorded expense transactions.",
        followUps: ["How much did I earn in the same period?"],
      },
    });

    expect(result.answer).toContain("Jamal");
    expect(result.answer).toContain("PKR 12,500");
    expect(result.followUps[0]).not.toContain("How much did I earn");
  });

  it("does not translate asset names or amounts", () => {
    const translated = localizeVerifiedFinanceText(
      "Based on recorded current prices, Bitcoin (BTC) has an unrealized profit of USD 42.50.",
      "es",
    );

    expect(translated).toContain("Bitcoin (BTC)");
    expect(translated).toContain("USD 42.50");
    expect(translated).toContain("ganancia no realizada");
  });

  it("keeps English unchanged", () => {
    expect(localizeVerifiedFinanceText("You have 3 active accounts.", "en")).toBe(
      "You have 3 active accounts.",
    );
  });
});
