import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildDashboardBalanceSummary,
  buildDashboardCashFlow,
  buildDashboardComparison,
  buildDashboardSpendingBreakdown,
  calculateDashboardPricedPortfolio,
  calculateDashboardTransactionSnapshot,
  calculateInvestmentContributions,
  getDashboardPeriodRanges,
  getInvestmentPerformanceSentiment,
  inspectDashboardInvestmentQuality,
  resolveDashboardSetupCounts,
  sanitizeDashboardTransactions,
} from "./dashboard-financial-semantics";

const baseRow = {
  id: "tx-1",
  date: "2026-07-10",
  type: "income",
  amount: 100,
  categoryId: "salary",
  categoryName: "Salary",
  categoryColor: "#16a34a",
};

describe("dashboard period semantics", () => {
  it("uses equivalent month-to-date ranges", () => {
    const ranges = getDashboardPeriodRanges("2026-07-16");
    expect(ranges.current).toEqual({ start: "2026-07-01", end: "2026-07-16" });
    expect(ranges.previous).toEqual({ start: "2026-06-01", end: "2026-06-16" });
    expect(ranges.query).toEqual({ start: "2026-06-01", end: "2026-07-16" });
  });

  it("clamps the previous range for short months and leap years", () => {
    expect(getDashboardPeriodRanges("2025-03-31").previous.end).toBe("2025-02-28");
    expect(getDashboardPeriodRanges("2024-03-31").previous.end).toBe("2024-02-29");
  });
});

describe("dashboard transaction sanitization", () => {
  it("keeps refunds while excluding transfers, investments, malformed values, and out-of-range dates", () => {
    const rows = [
      baseRow,
      { ...baseRow, id: "transfer", type: "transfer" },
      { ...baseRow, id: "investment", type: "investment" },
      { ...baseRow, id: "refund", type: "refund" },
      { ...baseRow, id: "bad-number", amount: "12oops" },
      { ...baseRow, id: "nan", amount: Number.NaN },
      { ...baseRow, id: "infinity", amount: Number.POSITIVE_INFINITY },
      { ...baseRow, id: "zero", amount: 0 },
      { ...baseRow, id: "negative", amount: -20 },
      { ...baseRow, id: "bad-date", date: "2026-02-30" },
      { ...baseRow, id: "future", date: "2026-07-17" },
    ];

    const result = sanitizeDashboardTransactions(rows, {
      start: "2026-07-01",
      end: "2026-07-16",
    });

    expect(result.map((row) => row.id)).toEqual(["tx-1", "refund"]);
    expect(result.every((row) => Number.isFinite(Number(row.amount)))).toBe(true);
  });
});

describe("dashboard KPI comparisons", () => {
  it.each([
    ["income", 150, 100, "up", "positive"],
    ["income", 50, 100, "down", "negative"],
    ["expenses", 150, 100, "up", "negative"],
    ["expenses", 50, 100, "down", "positive"],
    ["netSavings", 150, 100, "up", "positive"],
    ["netSavings", 50, 100, "down", "negative"],
  ] as const)(
    "%s keeps numeric direction separate from financial sentiment",
    (kind, current, previous, direction, sentiment) => {
      const result = buildDashboardComparison(kind, "Metric", current, previous);
      expect(result.direction).toBe(direction);
      expect(result.sentiment).toBe(sentiment);
    },
  );

  it("treats a smaller loss as a net-savings improvement without inventing a percentage", () => {
    const result = buildDashboardComparison("netSavings", "Net savings", -200, -500);
    expect(result).toMatchObject({
      label: "Improved",
      direction: "none",
      sentiment: "positive",
    });
    expect(result.accessibleLabel).toContain("Net savings improved, which is favorable");
  });

  it("uses truthful status wording for zero baselines and equality", () => {
    expect(buildDashboardComparison("income", "Income", 100, 0)).toMatchObject({
      label: "New activity",
      direction: "none",
    });
    expect(buildDashboardComparison("income", "Income", 0, 0)).toMatchObject({
      label: "No activity",
      direction: "none",
      sentiment: "neutral",
    });
    expect(buildDashboardComparison("income", "Income", 100, 100)).toMatchObject({
      label: "No change",
      direction: "flat",
    });
  });

  it("keeps contribution comparisons informational and performance sentiment truthful", () => {
    expect(
      buildDashboardComparison("investmentContribution", "Contributions", 150, 100),
    ).toMatchObject({ direction: "up", sentiment: "info" });
    expect(getInvestmentPerformanceSentiment(20)).toBe("positive");
    expect(getInvestmentPerformanceSentiment(-20)).toBe("negative");
  });

  it("produces accessible labels with direction and financial meaning", () => {
    const income = buildDashboardComparison("income", "Income", 150, 100);
    const expenses = buildDashboardComparison("expenses", "Expenses", 150, 100);
    expect(income.accessibleLabel).toContain("increased by 50%");
    expect(income.accessibleLabel).toContain("Higher income is favorable");
    expect(expenses.accessibleLabel).toContain("Higher expenses are unfavorable");
  });

  it("calculates KPI values only from sanitized income and expenses", () => {
    const ranges = getDashboardPeriodRanges("2026-07-16");
    const transactions = sanitizeDashboardTransactions([
      baseRow,
      { ...baseRow, id: "expense", type: "expense", amount: 40 },
      { ...baseRow, id: "previous", date: "2026-06-10", amount: 50 },
    ]);
    expect(calculateDashboardTransactionSnapshot(transactions, ranges)).toMatchObject({
      current: { income: 100, expenses: 40, netSavings: 60 },
      previous: { income: 50, expenses: 0, netSavings: 50 },
    });
  });
});

describe("dashboard charts and spending", () => {
  it("stops daily cash flow at today instead of adding future zero observations", () => {
    const ranges = getDashboardPeriodRanges("2026-07-16");
    const transactions = sanitizeDashboardTransactions([baseRow]);
    const points = buildDashboardCashFlow(transactions, ranges.current);
    expect(points).toHaveLength(16);
    expect(points.at(-1)?.dateKey).toBe("2026-07-16");
    expect(points.some((point) => point.dateKey === "2026-07-17")).toBe(false);
  });

  it("preserves the complete spending total through Other categories and stable rounding", () => {
    const ranges = getDashboardPeriodRanges("2026-07-16");
    const transactions = sanitizeDashboardTransactions(
      [40, 25, 15, 10, 6, 4].map((amount, index) => ({
        ...baseRow,
        id: `expense-${index}`,
        type: "expense",
        amount,
        categoryId: `category-${index}`,
        categoryName: `Category ${index}`,
      })),
    );
    const breakdown = buildDashboardSpendingBreakdown(transactions, ranges.current);
    expect(breakdown.total).toBe(100);
    expect(breakdown.data).toHaveLength(5);
    expect(breakdown.data.at(-1)).toMatchObject({
      id: "other-categories",
      name: "Other categories",
      value: 10,
    });
    expect(breakdown.data.reduce((sum, row) => sum + row.percentage, 0)).toBe(100);
  });
});

describe("dashboard investment and availability semantics", () => {
  it("uses equivalent periods for positive finite investment contributions", () => {
    const ranges = getDashboardPeriodRanges("2026-07-16");
    const result = calculateInvestmentContributions(
      [
        { quantity: 2, purchasePrice: 100, purchasedAt: "2026-07-10" },
        { quantity: 1, purchasePrice: 100, purchasedAt: "2026-06-10" },
        { quantity: -1, purchasePrice: 999, purchasedAt: "2026-07-10" },
      ],
      ranges,
    );
    expect(result).toMatchObject({ current: 200, previous: 100 });
    expect(result.comparison.sentiment).toBe("info");
  });

  it("separates invalid investments from holdings that are merely unpriced", () => {
    expect(
      inspectDashboardInvestmentQuality([
        { quantity: 1, purchasePrice: 100, currentPrice: 120 },
        { quantity: 2, purchasePrice: 50, currentPrice: 0 },
        { quantity: "bad", purchasePrice: 50, currentPrice: 60 },
      ]),
    ).toEqual({ invalidCount: 1, unpricedCount: 1 });
  });

  it("calculates value and performance only from holdings with usable pricing and cost basis", () => {
    expect(
      calculateDashboardPricedPortfolio([
        { quantity: 2, purchasePrice: 100, currentPrice: 125 },
        { quantity: 1, purchasePrice: 50, currentPrice: 0 },
        { quantity: 1, purchasePrice: "bad", currentPrice: 500 },
      ]),
    ).toEqual({
      totalInvested: 200,
      totalValue: 250,
      totalPnl: 50,
      totalPnLPct: 25,
    });
  });

  it("never labels partial account or investment data as a complete balance", () => {
    const partial = buildDashboardBalanceSummary({
      accounts: { status: "available", value: 1_000 },
      investments: {
        status: "partial",
        value: 500,
        issue: "One holding has no usable price.",
      },
    });
    expect(partial).toMatchObject({
      status: "partial",
      label: "Partial balance",
      value: 1_500,
    });

    const unavailable = buildDashboardBalanceSummary({
      accounts: { status: "unavailable", value: null },
      investments: { status: "unavailable", value: null },
    });
    expect(unavailable).toMatchObject({
      status: "unavailable",
      label: "Balance unavailable",
      value: null,
    });
  });

  it("does not turn failed setup counts into false new-user instructions", () => {
    expect(resolveDashboardSetupCounts("unavailable", {})).toBeNull();
    expect(resolveDashboardSetupCounts("available", { accounts: 0 })).toBeNull();
  });
});

describe("dashboard source contracts", () => {
  it("contains no fabricated KPI progress values or MetricCard progress prop", () => {
    const page = readFileSync("app/dashboard/page.tsx", "utf8");
    const metricCard = readFileSync("components/dashboard/MetricCard.tsx", "utf8");
    expect(page).not.toMatch(/progress=\{(?:62|64|38|68)\}/);
    expect(metricCard).not.toMatch(/\bprogress\s*:/);
  });
});
