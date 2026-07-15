import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_COLOR,
  OTHER_CATEGORIES_ID,
  UNSPECIFIED_SOURCE,
  UNKNOWN_ACCOUNT,
  buildAccountBreakdown,
  buildCashFlowSeries,
  buildCashFlowSeriesForRange,
  buildCashFlowSummary,
  buildDateBuckets,
  buildExpenseCategoryBreakdown,
  buildIncomeSourceSummary,
  buildSpendingData,
  calculateKpis,
  calculateKpisForRanges,
  calculateInvestmentMetrics,
  calculatePeriodFacts,
  calculateRoundedPercentages,
  compareExpenses,
  compareIncome,
  compareNetSavings,
  compareSavingsRate,
  formatRangeLabel,
  getCombinedQueryRange,
  getCurrentAndPreviousRange,
  getInclusiveDayCount,
  getLargestEntries,
  getPreviousCustomRange,
  parseAnalyticsSearchParams,
  parseDateKey,
  resolveAnalyticsRange,
  shiftDateKey,
  summarizeInvestmentPortfolio,
  validateCustomRange,
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
    accountId: null,
    accountName: null,
    accountType: null,
    sourceName: null,
    personName: null,
    itemName: null,
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

  it("uses the immediately previous six-calendar-month position mid-month", () => {
    expect(getCurrentAndPreviousRange("sixMonth", "2026-07-15")).toEqual({
      current: { start: "2026-02-01", end: "2026-07-15" },
      previous: { start: "2025-08-01", end: "2026-01-15" },
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

  it("keeps empty dates at zero activity and only carries known cumulative net flow", () => {
    const series = buildCashFlowSeriesForRange(
      [
        transaction({ id: "income", amount: 100, type: "income", date: "2026-07-01" }),
        transaction({ id: "expense", amount: 40, type: "expense", date: "2026-07-03" }),
      ],
      { start: "2026-07-01", end: "2026-07-04" },
    );

    expect(series.map(({ income }) => income)).toEqual([100, 0, 0, 0]);
    expect(series.map(({ expenses }) => expenses)).toEqual([0, 0, 40, 0]);
    expect(series.map(({ cumulativeNetFlow }) => cumulativeNetFlow)).toEqual([
      100, 100, 60, 60,
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

describe("Node 5 range resolution", () => {
  it("resolves Today and the previous calendar day", () => {
    expect(getCurrentAndPreviousRange("today", "2026-07-15")).toEqual({
      current: { start: "2026-07-15", end: "2026-07-15" },
      previous: { start: "2026-07-14", end: "2026-07-14" },
    });
  });

  it("keeps the existing seven-day Week semantics across a year boundary", () => {
    expect(getCurrentAndPreviousRange("week", "2026-01-03")).toEqual({
      current: { start: "2025-12-28", end: "2026-01-03" },
      previous: { start: "2025-12-21", end: "2025-12-27" },
    });
  });

  it("resolves an inclusive custom range and an equal-length preceding range", () => {
    expect(
      resolveAnalyticsRange("custom", "2026-07-15", {
        start: "2026-06-28",
        end: "2026-07-04",
      }),
    ).toEqual({
      period: "custom",
      current: { start: "2026-06-28", end: "2026-07-04" },
      previous: { start: "2026-06-21", end: "2026-06-27" },
    });
  });

  it("handles a one-day custom range", () => {
    expect(
      getPreviousCustomRange({ start: "2026-01-01", end: "2026-01-01" }),
    ).toEqual({ start: "2025-12-31", end: "2025-12-31" });
  });

  it("handles custom ranges across year boundaries and February 29", () => {
    const range = { start: "2024-02-29", end: "2024-03-02" };
    expect(getInclusiveDayCount(range)).toBe(3);
    expect(getPreviousCustomRange(range)).toEqual({
      start: "2024-02-26",
      end: "2024-02-28",
    });
    expect(shiftDateKey("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("rejects missing, impossible, reversed, and future custom ranges", () => {
    expect(validateCustomRange("", "", "2026-07-15")).toMatchObject({
      valid: false,
      startError: "Choose a start date.",
      endError: "Choose an end date.",
    });
    expect(validateCustomRange("2026-02-30", "2026-03-01", "2026-07-15").startError).toBe(
      "Enter a valid start date.",
    );
    expect(validateCustomRange("2026-07-10", "2026-07-01", "2026-07-15").rangeError).toBe(
      "Start date must be on or before the end date.",
    );
    expect(validateCustomRange("2026-07-01", "2026-07-16", "2026-07-15").endError).toBe(
      "End date cannot be in the future.",
    );
  });

  it("uses Month by default and flags invalid direct URLs as reset", () => {
    expect(parseAnalyticsSearchParams({}, "2026-07-15")).toMatchObject({
      selection: { period: "month" },
      wasReset: false,
    });
    expect(
      parseAnalyticsSearchParams({ period: "quarter" }, "2026-07-15"),
    ).toMatchObject({ selection: { period: "month" }, wasReset: true });
    expect(
      parseAnalyticsSearchParams(
        { period: ["week", "year"] },
        "2026-07-15",
      ),
    ).toMatchObject({ selection: { period: "month" }, wasReset: true });
  });

  it("accepts a valid custom URL and rejects preset URLs with custom fields", () => {
    expect(
      parseAnalyticsSearchParams(
        { period: "custom", from: "2026-07-01", to: "2026-07-10" },
        "2026-07-15",
      ),
    ).toMatchObject({
      selection: {
        period: "custom",
        current: { start: "2026-07-01", end: "2026-07-10" },
      },
      wasReset: false,
    });
    expect(
      parseAnalyticsSearchParams(
        { period: "week", from: "2026-07-01" },
        "2026-07-15",
      ),
    ).toMatchObject({ selection: { period: "month" }, wasReset: true });
  });

  it("builds the exact combined server query window", () => {
    expect(
      getCombinedQueryRange(getCurrentAndPreviousRange("week", "2026-07-15")),
    ).toEqual({ start: "2026-07-02", end: "2026-07-15" });
  });

  it("formats current-period labels without timezone drift", () => {
    expect(formatRangeLabel({ start: "2025-12-31", end: "2026-01-02" })).toBe(
      "31 Dec 2025 – 2 Jan 2026",
    );
  });
});

describe("adaptive chart buckets", () => {
  function expectContinuous(range: { start: string; end: string }) {
    const buckets = buildDateBuckets(range);
    expect(buckets[0]?.start).toBe(range.start);
    expect(buckets.at(-1)?.end).toBe(range.end);
    for (let index = 1; index < buckets.length; index += 1) {
      expect(shiftDateKey(buckets[index - 1].end, 1)).toBe(buckets[index].start);
      expect(buckets[index].start > buckets[index - 1].start).toBe(true);
    }
  }

  it("uses daily buckets for one to fourteen inclusive days", () => {
    const buckets = buildDateBuckets({ start: "2026-07-01", end: "2026-07-14" });
    expect(buckets).toHaveLength(14);
    expect(buckets.every((bucket) => bucket.start === bucket.end)).toBe(true);
    expectContinuous({ start: "2026-07-01", end: "2026-07-14" });
  });

  it("uses consecutive weekly buckets for fifteen to ninety days", () => {
    const range = { start: "2026-01-29", end: "2026-03-01" };
    const buckets = buildDateBuckets(range);
    expect(buckets).toHaveLength(5);
    expect(getInclusiveDayCount(buckets[0])).toBe(7);
    expect(getInclusiveDayCount(buckets.at(-1)!)).toBe(4);
    expectContinuous(range);
  });

  it("uses clamped calendar-month buckets for up to 730 days", () => {
    const range = { start: "2025-11-17", end: "2026-03-04" };
    const buckets = buildDateBuckets(range);
    expect(buckets.map((bucket) => [bucket.start, bucket.end])).toEqual([
      ["2025-11-17", "2025-11-30"],
      ["2025-12-01", "2025-12-31"],
      ["2026-01-01", "2026-01-31"],
      ["2026-02-01", "2026-02-28"],
      ["2026-03-01", "2026-03-04"],
    ]);
    expectContinuous(range);
  });

  it("uses clamped calendar-year buckets for more than 730 days", () => {
    const range = { start: "2023-06-10", end: "2026-08-20" };
    const buckets = buildDateBuckets(range);
    expect(buckets.map((bucket) => [bucket.start, bucket.end])).toEqual([
      ["2023-06-10", "2023-12-31"],
      ["2024-01-01", "2024-12-31"],
      ["2025-01-01", "2025-12-31"],
      ["2026-01-01", "2026-08-20"],
    ]);
    expectContinuous(range);
  });

  it("preserves negative cumulative flow and produces an accessible summary", () => {
    const range = { start: "2026-07-01", end: "2026-07-02" };
    const series = buildCashFlowSeriesForRange(
      [transaction({ id: "expense", type: "expense", amount: 40, date: "2026-07-01" })],
      range,
    );
    expect(series.map((point) => point.cumulativeNetFlow)).toEqual([-40, -40]);
    expect(buildCashFlowSummary(series)).toContain("net cash flow -40");
  });
});

describe("range-based KPI facts", () => {
  const ranges = {
    current: { start: "2026-07-01", end: "2026-07-03" },
    previous: { start: "2026-06-28", end: "2026-06-30" },
  };

  it("uses exact inclusive boundaries and rejects records outside them", () => {
    const transactions = [
      transaction({ id: "start", date: "2026-07-01", amount: 300 }),
      transaction({ id: "end", date: "2026-07-03", amount: 60, type: "expense" }),
      transaction({ id: "outside", date: "2026-07-04", amount: 999 }),
      transaction({ id: "previous", date: "2026-06-30", amount: 100 }),
    ];
    const kpis = calculateKpisForRanges(transactions, ranges);
    expect(kpis).toMatchObject({
      totalIncome: 300,
      totalExpenses: 60,
      netSavings: 240,
      savingsRate: 80,
    });
    expect(kpis.incomeChange.label).toBe("+200%");
  });

  it("counts valid entries and calculates averages across inclusive calendar days", () => {
    const facts = calculatePeriodFacts(
      [
        transaction({ id: "a", date: "2026-07-01", amount: 300 }),
        transaction({ id: "b", date: "2026-07-02", amount: 90, type: "expense" }),
        transaction({ id: "bad", date: "2026-07-03", amount: "NaN" }),
      ],
      ranges.current,
    );
    expect(facts).toEqual({
      inclusiveDays: 3,
      incomeCount: 1,
      expenseCount: 1,
      averageDailyIncome: 100,
      averageDailySpending: 30,
    });
  });

  it("keeps expense-only savings negative and the savings rate unavailable", () => {
    const kpis = calculateKpisForRanges(
      [transaction({ type: "expense", amount: 50, date: "2026-07-01" })],
      ranges,
    );
    expect(kpis.netSavings).toBe(-50);
    expect(kpis.savingsRate).toBeNull();
  });
});

describe("Node 5 breakdowns and largest entries", () => {
  const range = { start: "2026-07-01", end: "2026-07-31" };

  it("groups income sources case-insensitively without inferring missing sources", () => {
    const summary = buildIncomeSourceSummary(
      [
        transaction({ id: "a", sourceName: " Salary ", amount: 70 }),
        transaction({ id: "b", sourceName: "salary", amount: 30 }),
        transaction({ id: "c", sourceName: null, personName: "Employer", itemName: "Bonus", amount: 50 }),
      ],
      range,
    );
    expect(summary).toMatchObject({ totalAmount: 150, totalEntries: 3, explicitEntries: 2 });
    expect(summary.items).toEqual([
      { id: "source:salary", name: "Salary", amount: 100, percentage: 66.7 },
      { id: "source:unspecified", name: UNSPECIFIED_SOURCE, amount: 50, percentage: 33.3 },
    ]);
  });

  it("groups categories by stable id and preserves an exact remainder", () => {
    const items = buildExpenseCategoryBreakdown(
      [
        ...[100, 90, 80, 70, 60, 50].map((amount, index) =>
          transaction({
            id: String(index),
            type: "expense",
            amount,
            categoryId: `category-${index}`,
            categoryName: `Category ${index}`,
          }),
        ),
      ],
      range,
    );
    expect(items).toHaveLength(5);
    expect(items.at(-1)).toMatchObject({
      id: OTHER_CATEGORIES_ID,
      amount: 110,
    });
    expect(items.reduce((sum, item) => sum + item.amount, 0)).toBe(450);
    expect(items.reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
  });

  it("groups account spending by stable id and truthfully labels unavailable accounts", () => {
    const items = buildAccountBreakdown(
      [
        transaction({ id: "a", type: "expense", amount: 80, accountId: "cash", accountName: "Cash", accountType: "wallet" }),
        transaction({ id: "b", type: "expense", amount: 20, accountId: "cash", accountName: "Cash", accountType: "wallet" }),
        transaction({ id: "c", type: "expense", amount: 50, accountId: "deleted", accountName: null }),
        transaction({ id: "d", type: "expense", amount: 50, accountId: null, accountName: null }),
      ],
      range,
    );
    expect(items.map((item) => [item.id, item.name, item.amount])).toEqual([
      ["cash", "Cash", 100],
      ["account:unknown", UNKNOWN_ACCOUNT, 50],
      ["deleted", UNKNOWN_ACCOUNT, 50],
    ]);
    expect(items.reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
  });

  it("allocates rounded percentages to exactly 100", () => {
    expect(calculateRoundedPercentages([1, 1, 1])).toEqual([33.4, 33.3, 33.3]);
    expect(calculateRoundedPercentages([0, Number.NaN])).toEqual([0, 0]);
  });

  it("sorts tied largest entries deterministically and follows title fallbacks", () => {
    const input = [
      transaction({ id: "b", type: "expense", amount: 100, itemName: "Laptop", date: "2026-07-10", accountName: "Card" }),
      transaction({ id: "a", type: "expense", amount: 100, itemName: null, personName: "Ali", date: "2026-07-10" }),
      transaction({ id: "c", type: "expense", amount: 90, itemName: null, personName: null, categoryName: "Food", date: "2026-07-11" }),
    ];
    const entries = getLargestEntries(input, range, "expense");
    expect(entries.map((entry) => [entry.id, entry.title])).toEqual([
      ["a", "Ali"],
      ["b", "Laptop"],
      ["c", "Food"],
    ]);
  });

  it("does not mutate inputs while building breakdowns", () => {
    const input = [transaction({ id: "a", type: "expense", accountId: "one", sourceName: "Salary" })];
    const snapshot = input.map((item) => ({ ...item }));
    buildIncomeSourceSummary(input, range);
    buildAccountBreakdown(input, range);
    getLargestEntries(input, range, "expense");
    expect(input).toEqual(snapshot);
  });
});

describe("expanded investment snapshot integrity", () => {
  it("calculates current value and unrealized P/L", () => {
    expect(calculateInvestmentMetrics(2, 100, 125)).toEqual({
      invested: 200,
      value: 250,
      pnl: 50,
      pnlPct: 25,
    });
  });

  it("preserves no-cost-basis handling", () => {
    expect(calculateInvestmentMetrics(3, 0, 10)).toEqual({
      invested: 0,
      value: 30,
      pnl: 30,
      pnlPct: null,
    });
  });

  it("rejects invalid investment metrics", () => {
    expect(calculateInvestmentMetrics("bad", 10, 20)).toBeNull();
    expect(calculateInvestmentMetrics(1, -10, 20)).toBeNull();
    expect(calculateInvestmentMetrics(Number.MAX_VALUE, Number.MAX_VALUE, 1)).toBeNull();
  });
});
