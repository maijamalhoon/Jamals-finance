import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_COLOR,
  OTHER_CATEGORIES_ID,
  buildCashFlowSeries,
  buildSpendingData,
  calculateKpis,
  compareExpenses,
  compareIncome,
  compareNetSavings,
  compareSavingsRate,
  getCurrentAndPreviousRange,
  parseDateKey,
  summarizeInvestmentPortfolio,
  type AnalyticsInvestmentData,
  type AnalyticsTransactionData,
} from "./calculations";

function transaction(
  overrides: Partial<AnalyticsTransactionData>,
): AnalyticsTransactionData {
  return {
    id: "transaction-1",
    amount: 100,
    date: "2026-07-10",
    type: "income",
    categoryId: "uncategorized",
    categoryName: "Other",
    categoryColor: null,
    ...overrides,
  };
}

function investment(
  id: string,
  value: number,
): AnalyticsInvestmentData {
  return {
    id,
    name: id,
    symbol: null,
    type: "Other",
    invested: value - 5,
    value,
    pnl: 5,
    pnlPct: 10,
    color: "#64748b",
  };
}

describe("analytics date ranges", () => {
  it("parses valid date keys and rejects impossible calendar dates", () => {
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });

  it("builds the current and previous seven-day ranges", () => {
    expect(getCurrentAndPreviousRange("week", "2026-07-10")).toEqual({
      current: { start: "2026-07-04", end: "2026-07-10" },
      previous: { start: "2026-06-27", end: "2026-07-03" },
    });
  });

  it("compares a partial month with the same elapsed prior-month days", () => {
    expect(getCurrentAndPreviousRange("month", "2026-07-10")).toEqual({
      current: { start: "2026-07-01", end: "2026-07-10" },
      previous: { start: "2026-06-01", end: "2026-06-10" },
    });
  });

  it("clamps the prior month to its final day", () => {
    expect(
      getCurrentAndPreviousRange("month", "2025-03-31").previous,
    ).toEqual({ start: "2025-02-01", end: "2025-02-28" });
  });

  it("uses comparable six-calendar-month positions", () => {
    expect(getCurrentAndPreviousRange("sixMonth", "2026-08-31")).toEqual({
      current: { start: "2026-03-01", end: "2026-08-31" },
      previous: { start: "2025-09-01", end: "2026-02-28" },
    });
  });

  it("builds a year-to-date comparison", () => {
    expect(getCurrentAndPreviousRange("year", "2026-07-10")).toEqual({
      current: { start: "2026-01-01", end: "2026-07-10" },
      previous: { start: "2025-01-01", end: "2025-07-10" },
    });
  });

  it("clamps February 29 to February 28 in the previous year", () => {
    expect(
      getCurrentAndPreviousRange("year", "2024-02-29").previous,
    ).toEqual({ start: "2023-01-01", end: "2023-02-28" });
  });
});

describe("transaction analytics", () => {
  it("returns honest empty results for an empty transaction array", () => {
    const kpis = calculateKpis([], "month", "2026-07-10");

    expect(kpis).toMatchObject({
      totalIncome: 0,
      totalExpenses: 0,
      netSavings: 0,
      savingsRate: null,
    });
    expect(kpis.incomeChange.label).toBe("No change");
    expect(buildSpendingData([], { start: "2026-07-01", end: "2026-07-10" })).toEqual([]);
  });

  it("calculates income-only data", () => {
    const kpis = calculateKpis(
      [transaction({ amount: 500, type: "income", date: "2026-07-04" })],
      "month",
      "2026-07-10",
    );

    expect(kpis.totalIncome).toBe(500);
    expect(kpis.totalExpenses).toBe(0);
    expect(kpis.netSavings).toBe(500);
    expect(kpis.savingsRate).toBe(100);
  });

  it("calculates expense-only data without inventing income", () => {
    const kpis = calculateKpis(
      [transaction({ amount: 275, type: "expense", date: "2026-07-04" })],
      "month",
      "2026-07-10",
    );

    expect(kpis.totalIncome).toBe(0);
    expect(kpis.totalExpenses).toBe(275);
    expect(kpis.netSavings).toBe(-275);
    expect(kpis.savingsRate).toBeNull();
  });

  it("preserves negative cumulative net cash flow", () => {
    const series = buildCashFlowSeries(
      [transaction({ amount: 150, type: "expense", date: "2026-07-04" })],
      "week",
      "2026-07-10",
    );

    expect(series[0].cumulativeNetFlow).toBe(-150);
    expect(series.at(-1)?.cumulativeNetFlow).toBe(-150);
  });

  it("accumulates real net cash flow across chronological buckets", () => {
    const series = buildCashFlowSeries(
      [
        transaction({ id: "a", amount: 100, type: "income", date: "2026-07-04" }),
        transaction({ id: "b", amount: 30, type: "expense", date: "2026-07-05" }),
        transaction({ id: "c", amount: 20, type: "income", date: "2026-07-10" }),
      ],
      "week",
      "2026-07-10",
    );

    expect(series.map((point) => point.cumulativeNetFlow)).toEqual([
      100, 70, 70, 70, 70, 70, 90,
    ]);
  });

  it("aggregates real expense records by category id", () => {
    const spending = buildSpendingData(
      [
        transaction({ id: "a", amount: 40, type: "expense", categoryId: "food", categoryName: "Food", categoryColor: "#123456" }),
        transaction({ id: "b", amount: 60, type: "expense", categoryId: "food", categoryName: "Food", categoryColor: "#123456" }),
        transaction({ id: "c", amount: 25, type: "expense", categoryId: "fuel", categoryName: "Fuel", categoryColor: "#abcdef" }),
      ],
      { start: "2026-07-01", end: "2026-07-10" },
    );

    expect(spending).toEqual([
      { id: "food", name: "Food", amount: 100, color: "#123456" },
      { id: "fuel", name: "Fuel", amount: 25, color: "#abcdef" },
    ]);
  });

  it("keeps five or fewer spending categories as individual items", () => {
    const input = [
      transaction({ id: "a", amount: 50, type: "expense", categoryId: "a", categoryName: "A", categoryColor: "#111111" }),
      transaction({ id: "b", amount: 40, type: "expense", categoryId: "b", categoryName: "B", categoryColor: "#222222" }),
      transaction({ id: "c", amount: 30, type: "expense", categoryId: "c", categoryName: "C", categoryColor: "#333333" }),
      transaction({ id: "d", amount: 20, type: "expense", categoryId: "d", categoryName: "D", categoryColor: "#444444" }),
      transaction({ id: "e", amount: 10, type: "expense", categoryId: "e", categoryName: "E", categoryColor: "#555555" }),
    ];

    const spending = buildSpendingData(input, {
      start: "2026-07-01",
      end: "2026-07-10",
    });

    expect(spending).toEqual([
      { id: "a", name: "A", amount: 50, color: "#111111" },
      { id: "b", name: "B", amount: 40, color: "#222222" },
      { id: "c", name: "C", amount: 30, color: "#333333" },
      { id: "d", name: "D", amount: 20, color: "#444444" },
      { id: "e", name: "E", amount: 10, color: "#555555" },
    ]);
    expect(spending.find((item) => item.id === OTHER_CATEGORIES_ID)).toBeUndefined();
  });

  it("keeps the top four categories and preserves all remaining spending in one aggregate", () => {
    const input = [
      transaction({ id: "a", amount: 100, type: "expense", categoryId: "a", categoryName: "A" }),
      transaction({ id: "b", amount: 90, type: "expense", categoryId: "b", categoryName: "B" }),
      transaction({ id: "c", amount: 80, type: "expense", categoryId: "c", categoryName: "C" }),
      transaction({ id: "d", amount: 70, type: "expense", categoryId: "d", categoryName: "D" }),
      transaction({ id: "e", amount: 60, type: "expense", categoryId: "e", categoryName: "E" }),
      transaction({ id: "f", amount: 50, type: "expense", categoryId: "f", categoryName: "F" }),
      transaction({ id: "g", amount: 40, type: "expense", categoryId: "g", categoryName: "G" }),
      transaction({ id: "income", amount: 999, type: "income", categoryId: "income", categoryName: "Income" }),
      transaction({ id: "old", amount: 999, type: "expense", date: "2026-06-30", categoryId: "old", categoryName: "Old" }),
    ];

    const spending = buildSpendingData(input, {
      start: "2026-07-01",
      end: "2026-07-10",
    });
    const aggregate = spending.at(-1);

    expect(spending).toHaveLength(5);
    expect(spending.slice(0, 4).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(aggregate).toEqual({
      id: OTHER_CATEGORIES_ID,
      name: "Other categories",
      amount: 150,
      color: DEFAULT_CATEGORY_COLOR,
    });
    expect(spending.reduce((sum, item) => sum + item.amount, 0)).toBe(490);
  });

  it("does not mutate transaction input while aggregating categories", () => {
    const input = [
      transaction({ id: "a", amount: 60, type: "expense", categoryId: "a" }),
      transaction({ id: "b", amount: 50, type: "expense", categoryId: "b" }),
      transaction({ id: "c", amount: 40, type: "expense", categoryId: "c" }),
      transaction({ id: "d", amount: 30, type: "expense", categoryId: "d" }),
      transaction({ id: "e", amount: 20, type: "expense", categoryId: "e" }),
      transaction({ id: "f", amount: 10, type: "expense", categoryId: "f" }),
    ];
    const snapshot = input.map((item) => ({ ...item }));

    buildSpendingData(input, {
      start: "2026-07-01",
      end: "2026-07-10",
    });

    expect(input).toEqual(snapshot);
  });

  it("uses a neutral color for invalid or missing category colors", () => {
    const spending = buildSpendingData(
      [
        transaction({ id: "a", type: "expense", categoryId: "bad", categoryColor: "red" }),
        transaction({ id: "b", type: "expense", categoryId: "missing", categoryColor: null }),
      ],
      { start: "2026-07-01", end: "2026-07-10" },
    );

    expect(spending.map((item) => item.color)).toEqual([
      DEFAULT_CATEGORY_COLOR,
      DEFAULT_CATEGORY_COLOR,
    ]);
  });

  it("ignores malformed and non-positive amounts safely", () => {
    const kpis = calculateKpis(
      [
        transaction({ id: "bad-number", amount: "not-a-number" }),
        transaction({ id: "negative", amount: -100 }),
      ],
      "month",
      "2026-07-10",
    );

    expect(kpis.totalIncome).toBe(0);
  });
});

describe("comparison semantics", () => {
  it("marks current activity with a zero prior baseline as New", () => {
    expect(compareIncome(100, 0)).toEqual({
      kind: "status",
      label: "New",
      sentiment: "positive",
      value: null,
    });
  });

  it("marks zero current and previous activity as No change", () => {
    expect(compareIncome(0, 0).label).toBe("No change");
  });

  it("marks an expense increase as unfavorable", () => {
    expect(compareExpenses(120, 100)).toMatchObject({
      kind: "percentage",
      label: "+20%",
      sentiment: "negative",
    });
  });

  it("marks an expense decrease as favorable", () => {
    expect(compareExpenses(80, 100)).toMatchObject({
      kind: "percentage",
      label: "-20%",
      sentiment: "positive",
    });
  });

  it("expresses savings-rate movement in percentage points", () => {
    expect(compareSavingsRate(25, 20)).toEqual({
      kind: "percentagePoints",
      label: "+5 pp",
      sentiment: "positive",
      value: 5,
    });
  });

  it("uses a status instead of a percentage for negative prior savings", () => {
    expect(compareNetSavings(-20, -50)).toEqual({
      kind: "status",
      label: "Improved",
      sentiment: "positive",
      value: null,
    });
  });
});

describe("investment portfolio integrity", () => {
  it("uses every holding in totals while displaying only the top four", () => {
    const holdings = [
      investment("one", 10),
      investment("two", 50),
      investment("three", 20),
      investment("four", 40),
      investment("five", 30),
    ];
    const originalOrder = holdings.map((item) => item.id);
    const summary = summarizeInvestmentPortfolio(holdings);

    expect(summary.totalValue).toBe(150);
    expect(summary.totalInvested).toBe(125);
    expect(summary.totalPnl).toBe(25);
    expect(summary.displayedHoldings.map((item) => item.id)).toEqual([
      "two",
      "four",
      "five",
      "three",
    ]);
    expect(holdings.map((item) => item.id)).toEqual(originalOrder);
  });

  it("returns no fallback financial records for empty inputs", () => {
    expect(summarizeInvestmentPortfolio([])).toEqual({
      totalValue: 0,
      totalInvested: 0,
      totalPnl: 0,
      displayedHoldings: [],
    });
    expect(
      buildSpendingData([], { start: "2026-07-01", end: "2026-07-10" }),
    ).toEqual([]);
  });
});
