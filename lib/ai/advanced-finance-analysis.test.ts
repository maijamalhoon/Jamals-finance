import { describe, expect, it } from "vitest";

import {
  analyzeFinanceHistory,
  inflationAdjustedValue,
  normalizeAdvancedFinanceQuestion,
  parseAdvancedFinanceIntent,
  projectSavings,
} from "@/lib/ai/advanced-finance-analysis";

describe("advanced finance intent parsing", () => {
  it("understands Roman Urdu projections and averages", () => {
    expect(
      normalizeAdvancedFinanceQuestion("20 saal baad meri bachat kitni hogi?"),
    ).toContain("20 years");
    expect(
      parseAdvancedFinanceIntent("monthly ausat income aur kharch"),
    ).toEqual({ kind: "monthly_average" });
  });

  it("detects peak spending and flow mapping", () => {
    expect(
      parseAdvancedFinanceIntent("Which month had the highest spending?"),
    ).toEqual({ kind: "peak_spending", dimension: "month" });
    expect(
      parseAdvancedFinanceIntent("Where did my money come from and where was it spent?"),
    ).toEqual({ kind: "flow_map", direction: "both" });
  });

  it("extracts explicit projection assumptions", () => {
    expect(
      parseAdvancedFinanceIntent(
        "Project my savings after 20 years with return 8% and inflation 5%",
      ),
    ).toEqual({
      kind: "projection",
      years: 20,
      annualReturnPct: 8,
      inflationPct: 5,
    });
  });
});

describe("advanced finance calculations", () => {
  const history = analyzeFinanceHistory([
    {
      amount: 1000,
      date: "2026-01-02",
      type: "income",
      sourceName: "Salary",
    },
    {
      amount: 300,
      date: "2026-01-03",
      type: "expense",
      category: "Food",
      itemName: "Groceries",
    },
    {
      amount: 2000,
      date: "2026-02-02",
      type: "income",
      sourceName: "Salary",
    },
    {
      amount: 900,
      date: "2026-02-07",
      type: "expense",
      category: "Rent",
      personName: "Landlord",
    },
    {
      amount: 100,
      date: "2026-02-08",
      type: "refund",
      category: "Rent",
      personName: "Landlord",
    },
  ]);

  it("calculates calendar-month averages and net refunds", () => {
    expect(history.monthCount).toBe(2);
    expect(history.totals).toEqual({ income: 3000, expenses: 1100, savings: 1900 });
    expect(history.monthlyAverage).toEqual({
      income: 1500,
      expenses: 550,
      savings: 950,
    });
  });

  it("finds peak spending and ranked flows", () => {
    expect(history.peakSpending.month).toEqual({
      label: "2026-02",
      amount: 800,
    });
    expect(history.peakSpending.category).toEqual({
      label: "Rent",
      amount: 800,
    });
    expect(history.incomeSources[0]).toEqual({
      label: "Salary",
      amount: 3000,
    });
  });

  it("projects savings and calculates real value", () => {
    const projection = projectSavings({
      startingBalance: 10000,
      monthlyContribution: 1000,
      years: 10,
      annualReturnPct: 0,
      inflationPct: 5,
    });
    expect(projection.nominal).toBe(130000);
    expect(projection.real).toBeCloseTo(79810.72, 1);
    expect(
      inflationAdjustedValue({ amount: 100000, years: 10, inflationPct: 5 }),
    ).toBeCloseTo(61391.33, 1);
  });
});
