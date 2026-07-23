import { describe, expect, it } from "vitest";

import { normalizeMultilingualFinanceQuestion } from "@/lib/ai/multilingual-finance-normalizer";

describe("normalizeMultilingualFinanceQuestion", () => {
  it("normalizes Roman Urdu finance wording", () => {
    expect(
      normalizeMultilingualFinanceQuestion(
        "kal coffee par kitna kharch hoa aur income kitni thi?",
      ),
    ).toContain("yesterday");
    expect(
      normalizeMultilingualFinanceQuestion(
        "kal coffee par kitna kharch hoa aur income kitni thi?",
      ),
    ).toContain("spending");
  });

  it("normalizes Urdu, Hindi, Arabic, and Spanish periods", () => {
    expect(normalizeMultilingualFinanceQuestion("اس مہینے خرچ کتنا تھا؟")).toContain(
      "this month",
    );
    expect(normalizeMultilingualFinanceQuestion("पिछले महीने कितना खर्च हुआ?")).toContain(
      "last month",
    );
    expect(normalizeMultilingualFinanceQuestion("كم أنفقت هذا الأسبوع؟")).toContain(
      "this week",
    );
    expect(normalizeMultilingualFinanceQuestion("¿Cuánto gasté ayer?")).toContain(
      "yesterday",
    );
  });

  it("repairs common finance spelling mistakes", () => {
    expect(normalizeMultilingualFinanceQuestion("my expences this mont")).toBe(
      "my expenses this month",
    );
    expect(normalizeMultilingualFinanceQuestion("profitt on investmnt")).toBe(
      "profit on investments",
    );
  });
});
