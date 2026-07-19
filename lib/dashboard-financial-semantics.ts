import {
  buildSpendingData,
  calculateKpisForRanges,
  calculateRoundedPercentages,
  compareExpenses,
  compareIncome,
  compareNetSavings,
  getCombinedQueryRange,
  getCurrentAndPreviousRange,
  getInclusiveDayCount,
  parseDateKey,
  shiftDateKey,
  sumTransactions,
  toFiniteNumber,
  type AnalyticsTransactionData,
  type ChangeResult,
  type DateRange,
  type PeriodRanges,
} from "./analytics/calculations";
import { formatAppMonth } from "./dates";
import { calculateInvestmentPosition } from "./investments/calculations";

export type DashboardDirection = "up" | "down" | "flat" | "none";
export type DashboardSentiment =
  | "positive"
  | "negative"
  | "neutral"
  | "info"
  | "warning";
export type DashboardAvailability = "available" | "partial" | "unavailable";
export type DashboardMetricKind =
  | "income"
  | "expenses"
  | "netSavings"
  | "investmentContribution";

export interface DashboardTransactionInput {
  id?: unknown;
  amount?: unknown;
  date?: unknown;
  type?: unknown;
  categoryId?: unknown;
  categoryName?: unknown;
  categoryColor?: unknown;
  accountId?: unknown;
  accountName?: unknown;
  sourceName?: unknown;
  personName?: unknown;
  itemName?: unknown;
}

export interface DashboardComparison {
  label: string;
  basis: "vs same period last month";
  direction: DashboardDirection;
  sentiment: DashboardSentiment;
  accessibleLabel: string;
}

export interface DashboardTransactionSnapshot {
  current: {
    income: number;
    expenses: number;
    netSavings: number;
  };
  previous: {
    income: number;
    expenses: number;
    netSavings: number;
  };
  comparisons: {
    income: DashboardComparison;
    expenses: DashboardComparison;
    netSavings: DashboardComparison;
  };
}

export interface DashboardInvestmentInput {
  quantity?: unknown;
  purchasePrice?: unknown;
  purchasedAt?: unknown;
}

export interface DashboardInvestmentQualityInput {
  quantity?: unknown;
  purchasePrice?: unknown;
  currentPrice?: unknown;
}

export interface DashboardSpendingRow {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface DashboardCashFlowPoint {
  dateKey: string;
  date: string;
  day: number;
  income: number;
  expenses: number;
}

export interface BalanceSource {
  status: DashboardAvailability;
  value: number | null;
  issue?: string | null;
}

export interface DashboardBalanceSummary {
  status: DashboardAvailability;
  value: number | null;
  label: "Total net balance" | "Partial balance" | "Balance unavailable";
  description: string;
}

export type DashboardSetupCounts = {
  accounts: number;
  incomeTransactions: number;
  expenseTransactions: number;
  incomeCategories: number;
  expenseCategories: number;
  goals: number;
  investments: number;
};

const COMPARISON_BASIS = "vs same period last month" as const;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function finiteOrZero(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Object.is(value, -0) ? 0 : value;
}

function normalizedDateKey(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = parseDateKey(value.trim());
  if (!parsed) return null;
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(
    parsed.day,
  ).padStart(2, "0")}`;
}

function comparisonDirection(
  change: ChangeResult,
  current: number,
  previous: number,
): DashboardDirection {
  if (current === previous) return current === 0 ? "none" : "flat";
  if (
    change.kind !== "percentage" ||
    change.value === null ||
    !Number.isFinite(change.value)
  ) {
    return "none";
  }
  return change.value > 0 ? "up" : "down";
}

function comparisonLabel(
  change: ChangeResult,
  current: number,
  previous: number,
) {
  if (previous === 0 && current > 0) return "New activity";
  if (previous === 0 && current === 0) return "No activity";
  return change.label;
}

function comparisonMeaning(
  kind: DashboardMetricKind,
  direction: DashboardDirection,
  current: number,
  previous: number,
) {
  if (kind === "investmentContribution") {
    return "This describes contribution activity, not investment performance";
  }
  if (direction === "none") {
    if (current === previous) return "There is no comparable activity change";
    if (kind === "income") {
      return current > previous ? "Higher income is favorable" : "Lower income is unfavorable";
    }
    if (kind === "expenses") {
      return current > previous ? "Higher expenses are unfavorable" : "Lower expenses are favorable";
    }
    return current > previous ? "Net savings improved, which is favorable" : "Net savings declined, which is unfavorable";
  }
  if (direction === "flat") {
    return kind === "income" ? "Income did not change"
    : kind === "expenses" ? "Expenses did not change"
    : "Net savings did not change";
  }
  if (kind === "income") {
    return direction === "up" ? "Higher income is favorable" : "Lower income is unfavorable";
  }
  if (kind === "expenses") {
    return direction === "up" ? "Higher expenses are unfavorable" : "Lower expenses are favorable";
  }
  return direction === "up" ? "Higher net savings are favorable" : "Lower net savings are unfavorable";
}

function directionPhrase(direction: DashboardDirection, label: string) {
  if (direction === "up") return `increased by ${label.replace(/^\+/, "")}`;
  if (direction === "down") return `decreased by ${label.replace(/^-/, "")}`;
  if (direction === "flat") return "did not change";
  return label.toLowerCase();
}

export function getDashboardPeriodRanges(now: Date | string) {
  const ranges = getCurrentAndPreviousRange("month", now);
  return { ...ranges, query: getCombinedQueryRange(ranges) };
}

export function sanitizeDashboardTransactions(
  rows: ReadonlyArray<DashboardTransactionInput>,
  range?: DateRange,
): AnalyticsTransactionData[] {
  return rows.flatMap<AnalyticsTransactionData>((row) => {
    const id = normalizeText(row.id);
    const type = normalizeText(row.type).toLowerCase();
    const date = normalizedDateKey(row.date);
    const amount = toFiniteNumber(row.amount);
    if (
      !id ||
      !date ||
      amount === null ||
      amount <= 0 ||
      (type !== "income" && type !== "expense" && type !== "refund") ||
      (range && (date < range.start || date > range.end))
    ) {
      return [];
    }

    return [
      {
        id,
        amount,
        date,
        type,
        categoryId: normalizeText(row.categoryId) || "uncategorized",
        categoryName: normalizeText(row.categoryName) || "Other",
        categoryColor: normalizeText(row.categoryColor) || null,
        accountId: normalizeText(row.accountId) || null,
        accountName: normalizeText(row.accountName) || null,
        sourceName: normalizeText(row.sourceName) || null,
        personName: normalizeText(row.personName) || null,
        itemName: normalizeText(row.itemName) || null,
      },
    ];
  });
}

export function buildDashboardComparison(
  kind: DashboardMetricKind,
  title: string,
  currentValue: number,
  previousValue: number,
): DashboardComparison {
  const current = finiteOrZero(currentValue);
  const previous = finiteOrZero(previousValue);
  const change =
    kind === "income" ? compareIncome(current, previous)
    : kind === "expenses" ? compareExpenses(current, previous)
    : kind === "netSavings" ? compareNetSavings(current, previous)
    : compareIncome(current, previous);
  const direction = comparisonDirection(change, current, previous);
  const label = comparisonLabel(change, current, previous);
  const sentiment: DashboardSentiment =
    kind === "investmentContribution" ?
      current === previous ? "neutral" : "info"
    : change.sentiment;
  const phrase = directionPhrase(direction, label);
  const meaning = comparisonMeaning(kind, direction, current, previous);

  return {
    label,
    basis: COMPARISON_BASIS,
    direction,
    sentiment,
    accessibleLabel: `${title} ${phrase} ${COMPARISON_BASIS}. ${meaning}.`,
  };
}

export function calculateDashboardTransactionSnapshot(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  ranges: PeriodRanges,
): DashboardTransactionSnapshot {
  const kpis = calculateKpisForRanges(transactions, ranges);
  const previousIncome = sumTransactions(transactions, ranges.previous, "income");
  const previousExpenses = sumTransactions(transactions, ranges.previous, "expense");
  const previousNetSavings = previousIncome - previousExpenses;

  return {
    current: {
      income: finiteOrZero(kpis.totalIncome),
      expenses: finiteOrZero(kpis.totalExpenses),
      netSavings: finiteOrZero(kpis.netSavings),
    },
    previous: {
      income: finiteOrZero(previousIncome),
      expenses: finiteOrZero(previousExpenses),
      netSavings: finiteOrZero(previousNetSavings),
    },
    comparisons: {
      income: buildDashboardComparison(
        "income",
        "Month-to-date income",
        kpis.totalIncome,
        previousIncome,
      ),
      expenses: buildDashboardComparison(
        "expenses",
        "Month-to-date expenses",
        kpis.totalExpenses,
        previousExpenses,
      ),
      netSavings: buildDashboardComparison(
        "netSavings",
        "Month-to-date net savings",
        kpis.netSavings,
        previousNetSavings,
      ),
    },
  };
}

export function calculateInvestmentContributions(
  investments: ReadonlyArray<DashboardInvestmentInput>,
  ranges: PeriodRanges,
) {
  let current = 0;
  let previous = 0;

  for (const investment of investments) {
    const quantity = toFiniteNumber(investment.quantity);
    const purchasePrice = toFiniteNumber(investment.purchasePrice);
    const purchasedAt = normalizedDateKey(investment.purchasedAt);
    if (
      quantity === null ||
      purchasePrice === null ||
      quantity <= 0 ||
      purchasePrice <= 0 ||
      !purchasedAt
    ) {
      continue;
    }
    const contribution = quantity * purchasePrice;
    if (!Number.isFinite(contribution) || contribution <= 0) continue;
    if (purchasedAt >= ranges.current.start && purchasedAt <= ranges.current.end) {
      current += contribution;
    }
    if (purchasedAt >= ranges.previous.start && purchasedAt <= ranges.previous.end) {
      previous += contribution;
    }
  }

  const safeCurrent = finiteOrZero(current);
  const safePrevious = finiteOrZero(previous);
  return {
    current: safeCurrent,
    previous: safePrevious,
    comparison: buildDashboardComparison(
      "investmentContribution",
      "Investment contributions",
      safeCurrent,
      safePrevious,
    ),
  };
}

export function inspectDashboardInvestmentQuality(
  investments: ReadonlyArray<DashboardInvestmentQualityInput>,
) {
  let invalidCount = 0;
  let unpricedCount = 0;

  for (const investment of investments) {
    const quantity = toFiniteNumber(investment.quantity);
    const purchasePrice = toFiniteNumber(investment.purchasePrice);
    const currentPrice = toFiniteNumber(investment.currentPrice);
    if (
      quantity === null ||
      purchasePrice === null ||
      quantity <= 0 ||
      purchasePrice < 0
    ) {
      invalidCount += 1;
      continue;
    }
    if (currentPrice === null || currentPrice <= 0) unpricedCount += 1;
  }

  return { invalidCount, unpricedCount };
}

export function calculateDashboardPricedPortfolio(
  investments: ReadonlyArray<DashboardInvestmentQualityInput>,
) {
  let totalInvested = 0;
  let totalValue = 0;

  for (const investment of investments) {
    const position = calculateInvestmentPosition(
      investment.quantity,
      investment.purchasePrice,
      investment.currentPrice,
    );
    if (
      !position ||
      position.quantity <= 0 ||
      position.purchasePrice < 0 ||
      position.currentPrice <= 0
    ) {
      continue;
    }
    totalInvested += position.totalInvested;
    totalValue += position.currentValue;
  }

  const safeInvested = finiteOrZero(totalInvested);
  const safeValue = finiteOrZero(totalValue);
  const totalPnl = finiteOrZero(safeValue - safeInvested);
  return {
    totalInvested: safeInvested,
    totalValue: safeValue,
    totalPnl,
    totalPnLPct:
      safeInvested > 0 ? finiteOrZero((totalPnl / safeInvested) * 100) : null,
  };
}

export function buildDashboardCashFlow(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): DashboardCashFlowPoint[] {
  const days = getInclusiveDayCount(range);
  return Array.from({ length: days }, (_, index) => {
    const dateKey = shiftDateKey(range.start, index);
    const parsed = dateKey ? parseDateKey(dateKey) : null;
    if (!dateKey || !parsed || dateKey > range.end) return null;
    const dayRange = { start: dateKey, end: dateKey };
    return {
      dateKey,
      date: `${parsed.day} ${formatAppMonth(parsed.year, parsed.month)}`,
      day: parsed.day,
      income: finiteOrZero(sumTransactions(transactions, dayRange, "income")),
      expenses: finiteOrZero(sumTransactions(transactions, dayRange, "expense")),
    };
  }).filter((point): point is DashboardCashFlowPoint => Boolean(point));
}

export function buildDashboardSpendingBreakdown(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
) {
  const categories = buildSpendingData(transactions, range);
  const percentages = calculateRoundedPercentages(
    categories.map((category) => category.amount),
  );
  const data: DashboardSpendingRow[] = categories.map((category, index) => ({
    id: category.id,
    name: category.name,
    value: finiteOrZero(category.amount),
    percentage: percentages[index] ?? 0,
    color: category.color,
  }));
  return {
    data,
    total: finiteOrZero(data.reduce((sum, category) => sum + category.value, 0)),
  };
}

export function sumDashboardAccountBalances(values: ReadonlyArray<unknown>) {
  let value = 0;
  let invalidCount = 0;
  for (const rawValue of values) {
    const parsed = toFiniteNumber(rawValue);
    if (parsed === null) {
      invalidCount += 1;
      continue;
    }
    value += parsed;
  }
  return {
    value: finiteOrZero(value),
    invalidCount,
  };
}

export function buildDashboardBalanceSummary({
  accounts,
  investments,
}: {
  accounts: BalanceSource;
  investments: BalanceSource;
}): DashboardBalanceSummary {
  const usableSources = [accounts, investments].filter(
    (source) => source.status !== "unavailable" && source.value !== null,
  );
  if (usableSources.length === 0) {
    return {
      status: "unavailable",
      value: null,
      label: "Balance unavailable",
      description: "Cash and investment totals could not be loaded. Other available dashboard sections remain usable.",
    };
  }

  const value = finiteOrZero(
    usableSources.reduce((sum, source) => sum + (source.value ?? 0), 0),
  );
  const issues = [accounts.issue, investments.issue].filter(
    (issue): issue is string => Boolean(issue),
  );
  const complete =
    accounts.status === "available" &&
    investments.status === "available" &&
    accounts.value !== null &&
    investments.value !== null &&
    issues.length === 0;

  if (complete) {
    return {
      status: "available",
      value,
      label: "Total net balance",
      description: "Includes current account cash and the current priced investment portfolio.",
    };
  }

  return {
    status: "partial",
    value,
    label: "Partial balance",
    description:
      issues.length > 0 ?
        `Available total shown. ${issues.join(" ")}`
      : "Available total shown; one balance source could not be included.",
  };
}

export function resolveDashboardSetupCounts(
  status: DashboardAvailability,
  counts: Partial<Record<keyof DashboardSetupCounts, unknown>>,
): DashboardSetupCounts | null {
  if (status !== "available") return null;
  const keys: Array<keyof DashboardSetupCounts> = [
    "accounts",
    "incomeTransactions",
    "expenseTransactions",
    "incomeCategories",
    "expenseCategories",
    "goals",
    "investments",
  ];
  const entries = keys.map((key) => {
    const value = toFiniteNumber(counts[key]);
    return [key, value !== null && value >= 0 ? Math.floor(value) : null] as const;
  });
  if (entries.some(([, value]) => value === null)) return null;
  return Object.fromEntries(entries) as DashboardSetupCounts;
}

export function getInvestmentPerformanceSentiment(
  profitOrLoss: unknown,
): DashboardSentiment {
  const value = toFiniteNumber(profitOrLoss);
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function getRenderableTransactionAmount(value: unknown) {
  const amount = toFiniteNumber(value);
  return amount !== null && amount > 0 ? amount : null;
}
