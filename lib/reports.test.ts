import { describe, expect, it } from "vitest";

import { buildReport, getReportStartDate } from "./reports";

describe("report calculations", () => {
  it("builds a real six-month window and excludes neutral investment contributions", () => {
    const report = buildReport(
      [
        { id: "income", type: "income", amount: 1000, date: "2026-07-02" },
        {
          id: "expense",
          type: "expense",
          amount: 250,
          date: "2026-07-03",
          categories: { name: "Food", color: "#ef4444" },
        },
        {
          id: "investment",
          type: "investment",
          amount: 400,
          date: "2026-07-04",
          categories: { name: "Investments", color: "#7c5ce0" },
        },
        { id: "previous", type: "expense", amount: 75, date: "2026-02-12" },
        { id: "outside", type: "income", amount: 500, date: "2026-01-31" },
      ],
      "2026-07-16",
    );

    expect(report.monthly.map((point) => point.key)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(report.currentIncome).toBe(1000);
    expect(report.currentExpenses).toBe(250);
    expect(report.currentNet).toBe(750);
    expect(report.entryCount).toBe(3);
    expect(report.categories).toEqual([
      { name: "Food", amount: 250, color: "#ef4444", pct: 100 },
    ]);
  });

  it("rejects malformed dates and amounts without inventing report values", () => {
    const report = buildReport(
      [
        { id: "bad-date", type: "income", amount: 50, date: "2026-02-30" },
        { id: "bad-amount", type: "expense", amount: "NaN", date: "2026-07-01" },
      ],
      "2026-07-16",
    );

    expect(report.entryCount).toBe(0);
    expect(report.currentIncome).toBe(0);
    expect(report.currentExpenses).toBe(0);
  });

  it("returns the first day of the oldest report month", () => {
    expect(getReportStartDate("2026-02-10")).toBe("2025-09-01");
    expect(getReportStartDate("invalid")).toBeNull();
  });
});
