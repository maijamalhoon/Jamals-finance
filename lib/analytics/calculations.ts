import {
  formatAppMonth,
  formatDateKey,
  getAppDateParts,
  getDaysInMonth,
} from "../dates";

export type AnalyticsPeriod = "week" | "month" | "sixMonth" | "year";

export type ChangeSentiment =
  | "positive"
  | "negative"
  | "neutral"
  | "warning";

export interface AnalyticsTransactionData {
  id: string;
  amount: number | string | null;
  date: string;
  type: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
}

export interface AnalyticsInvestmentData {
  id: string;
  name: string;
  symbol: string | null;
  type: string;
  invested: number;
  value: number;
  pnl: number;
  pnlPct: number | null;
  color: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface PeriodRanges {
  current: DateRange;
  previous: DateRange;
}

export interface ChangeResult {
  kind: "percentage" | "percentagePoints" | "status";
  label: string;
  sentiment: ChangeSentiment;
  value: number | null;
}

export interface CashFlowPoint {
  label: string;
  start: string;
  end: string;
  income: number;
  expenses: number;
  cumulativeNetFlow: number;
}

export interface SpendingData {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface AnalyticsKpis {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number | null;
  incomeChange: ChangeResult;
  expensesChange: ChangeResult;
  netSavingsChange: ChangeResult;
  savingsRateChange: ChangeResult;
}

export interface InvestmentPortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  displayedHoldings: AnalyticsInvestmentData[];
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface Bucket extends DateRange {
  label: string;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/;

export const DEFAULT_CATEGORY_COLOR = "#64748b";

function roundTo(value: number, decimals = 1) {
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDateKey(value: string | null | undefined) {
  if (!value) return null;

  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > getDaysInMonth(year, month)
  ) {
    return null;
  }

  return { year, month, day } satisfies CalendarDate;
}

function toDateKey(parts: CalendarDate) {
  return formatDateKey(parts.year, parts.month, parts.day);
}

function getNowParts(now: Date | string): CalendarDate {
  if (now instanceof Date) {
    if (Number.isNaN(now.getTime())) {
      throw new Error("Analytics calculations require a valid now value.");
    }

    return getAppDateParts(now);
  }

  const parsed = parseDateKey(now);
  if (!parsed) {
    throw new Error("Analytics calculations require a valid now date key.");
  }

  return parsed;
}

function fromUtcDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function shiftDays(parts: CalendarDate, days: number) {
  return fromUtcDate(
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days)),
  );
}

function shiftMonths(parts: Pick<CalendarDate, "year" | "month">, months: number) {
  const monthIndex = parts.year * 12 + (parts.month - 1) + months;
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;

  return { year, month: month + 1 };
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, getDaysInMonth(year, month));
}

function monthEnd(year: number, month: number) {
  return formatDateKey(year, month, getDaysInMonth(year, month));
}

function minDateKey(left: string, right: string) {
  return left <= right ? left : right;
}

function weekdayLabel(parts: CalendarDate) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function getCurrentAndPreviousRange(
  period: AnalyticsPeriod,
  now: Date | string,
): PeriodRanges {
  const currentDate = getNowParts(now);
  const currentEnd = toDateKey(currentDate);

  if (period === "week") {
    const currentStart = shiftDays(currentDate, -6);
    const previousEnd = shiftDays(currentStart, -1);
    const previousStart = shiftDays(previousEnd, -6);

    return {
      current: { start: toDateKey(currentStart), end: currentEnd },
      previous: {
        start: toDateKey(previousStart),
        end: toDateKey(previousEnd),
      },
    };
  }

  if (period === "month") {
    const previousMonth = shiftMonths(currentDate, -1);

    return {
      current: {
        start: formatDateKey(currentDate.year, currentDate.month, 1),
        end: currentEnd,
      },
      previous: {
        start: formatDateKey(previousMonth.year, previousMonth.month, 1),
        end: formatDateKey(
          previousMonth.year,
          previousMonth.month,
          clampDay(previousMonth.year, previousMonth.month, currentDate.day),
        ),
      },
    };
  }

  if (period === "sixMonth") {
    const currentStartMonth = shiftMonths(currentDate, -5);
    const previousStartMonth = shiftMonths(currentStartMonth, -6);
    const previousEndMonth = shiftMonths(currentDate, -6);

    return {
      current: {
        start: formatDateKey(currentStartMonth.year, currentStartMonth.month, 1),
        end: currentEnd,
      },
      // Compare the same six calendar-month positions. The final prior month
      // ends on the same elapsed day, clamped when that month is shorter.
      previous: {
        start: formatDateKey(
          previousStartMonth.year,
          previousStartMonth.month,
          1,
        ),
        end: formatDateKey(
          previousEndMonth.year,
          previousEndMonth.month,
          clampDay(
            previousEndMonth.year,
            previousEndMonth.month,
            currentDate.day,
          ),
        ),
      },
    };
  }

  const previousYear = currentDate.year - 1;

  return {
    current: {
      start: formatDateKey(currentDate.year, 1, 1),
      end: currentEnd,
    },
    previous: {
      start: formatDateKey(previousYear, 1, 1),
      end: formatDateKey(
        previousYear,
        currentDate.month,
        clampDay(previousYear, currentDate.month, currentDate.day),
      ),
    },
  };
}

function getBuckets(period: AnalyticsPeriod, now: Date | string): Bucket[] {
  const range = getCurrentAndPreviousRange(period, now).current;
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);

  if (!start || !end) return [];

  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = shiftDays(start, index);
      const key = toDateKey(day);
      return { label: weekdayLabel(day), start: key, end: key };
    });
  }

  if (period === "month") {
    const buckets: Bucket[] = [];
    let cursor = start;
    let week = 1;

    while (toDateKey(cursor) <= range.end) {
      const bucketStart = toDateKey(cursor);
      const bucketEnd = minDateKey(toDateKey(shiftDays(cursor, 6)), range.end);
      buckets.push({ label: `W${week}`, start: bucketStart, end: bucketEnd });
      cursor = shiftDays(cursor, 7);
      week += 1;
    }

    return buckets;
  }

  const buckets: Bucket[] = [];
  let cursor = { year: start.year, month: start.month };

  while (
    cursor.year < end.year ||
    (cursor.year === end.year && cursor.month <= end.month)
  ) {
    buckets.push({
      label: formatAppMonth(cursor.year, cursor.month),
      start: formatDateKey(cursor.year, cursor.month, 1),
      end: minDateKey(monthEnd(cursor.year, cursor.month), range.end),
    });
    cursor = shiftMonths(cursor, 1);
  }

  return buckets;
}

function normalizedAmount(value: unknown) {
  const amount = toFiniteNumber(value);
  return amount !== null && amount > 0 ? amount : 0;
}

function transactionDateKey(transaction: AnalyticsTransactionData) {
  const parsed = parseDateKey(transaction.date);
  return parsed ? toDateKey(parsed) : null;
}

export function sumTransactions(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
  type: "income" | "expense",
) {
  return transactions.reduce((sum, transaction) => {
    const date = transactionDateKey(transaction);
    if (
      !date ||
      date < range.start ||
      date > range.end ||
      transaction.type.toLowerCase() !== type
    ) {
      return sum;
    }

    return sum + normalizedAmount(transaction.amount);
  }, 0);
}

function percentageChange(
  current: number,
  previous: number,
  favorableWhenIncreasing: boolean,
): ChangeResult {
  if (current === previous) {
    return {
      kind: "status",
      label: "No change",
      sentiment: "neutral",
      value: null,
    };
  }

  const value = roundTo(((current - previous) / previous) * 100);
  const improved = favorableWhenIncreasing ? value > 0 : value < 0;

  return {
    kind: "percentage",
    label: `${value > 0 ? "+" : ""}${value}%`,
    sentiment: improved ? "positive" : "negative",
    value,
  };
}

export function compareIncome(current: number, previous: number): ChangeResult {
  if (previous > 0) return percentageChange(current, previous, true);

  if (current > 0) {
    return { kind: "status", label: "New", sentiment: "positive", value: null };
  }

  return {
    kind: "status",
    label: "No change",
    sentiment: "neutral",
    value: null,
  };
}

export function compareExpenses(
  current: number,
  previous: number,
): ChangeResult {
  if (previous > 0) return percentageChange(current, previous, false);

  if (current > 0) {
    return { kind: "status", label: "New", sentiment: "negative", value: null };
  }

  return {
    kind: "status",
    label: "No change",
    sentiment: "neutral",
    value: null,
  };
}

export function compareNetSavings(
  current: number,
  previous: number,
): ChangeResult {
  if (previous > 0) return percentageChange(current, previous, true);

  if (current === previous) {
    return {
      kind: "status",
      label: "No change",
      sentiment: "neutral",
      value: null,
    };
  }

  if (previous === 0 && current > 0) {
    return { kind: "status", label: "New", sentiment: "positive", value: null };
  }

  if (current > previous) {
    return {
      kind: "status",
      label: "Improved",
      sentiment: "positive",
      value: null,
    };
  }

  return {
    kind: "status",
    label: "Declined",
    sentiment: "negative",
    value: null,
  };
}

export function compareSavingsRate(
  currentRate: number | null,
  previousRate: number | null,
): ChangeResult {
  if (previousRate === null) {
    if (currentRate === null) {
      return {
        kind: "status",
        label: "No change",
        sentiment: "neutral",
        value: null,
      };
    }

    return {
      kind: "status",
      label: "New",
      sentiment:
        currentRate > 0 ? "positive"
        : currentRate < 0 ? "negative"
        : "neutral",
      value: null,
    };
  }

  if (currentRate === null) {
    return {
      kind: "status",
      label: "No current income",
      sentiment: "warning",
      value: null,
    };
  }

  const value = roundTo(currentRate - previousRate);
  if (value === 0) {
    return {
      kind: "status",
      label: "No change",
      sentiment: "neutral",
      value: null,
    };
  }

  return {
    kind: "percentagePoints",
    label: `${value > 0 ? "+" : ""}${value} pp`,
    sentiment: value > 0 ? "positive" : "negative",
    value,
  };
}

export function calculateKpis(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  period: AnalyticsPeriod,
  now: Date | string,
): AnalyticsKpis {
  const ranges = getCurrentAndPreviousRange(period, now);
  const totalIncome = sumTransactions(transactions, ranges.current, "income");
  const totalExpenses = sumTransactions(
    transactions,
    ranges.current,
    "expense",
  );
  const previousIncome = sumTransactions(
    transactions,
    ranges.previous,
    "income",
  );
  const previousExpenses = sumTransactions(
    transactions,
    ranges.previous,
    "expense",
  );
  const netSavings = totalIncome - totalExpenses;
  const previousNetSavings = previousIncome - previousExpenses;
  const savingsRate =
    totalIncome > 0 ? roundTo((netSavings / totalIncome) * 100) : null;
  const previousSavingsRate =
    previousIncome > 0 ?
      roundTo((previousNetSavings / previousIncome) * 100)
    : null;

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    incomeChange: compareIncome(totalIncome, previousIncome),
    expensesChange: compareExpenses(totalExpenses, previousExpenses),
    netSavingsChange: compareNetSavings(netSavings, previousNetSavings),
    savingsRateChange: compareSavingsRate(savingsRate, previousSavingsRate),
  };
}

export function buildCashFlowSeries(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  period: AnalyticsPeriod,
  now: Date | string,
): CashFlowPoint[] {
  let runningNet = 0;

  return getBuckets(period, now).map((bucket) => {
    const income = sumTransactions(transactions, bucket, "income");
    const expenses = sumTransactions(transactions, bucket, "expense");
    runningNet += income - expenses;

    return {
      ...bucket,
      income,
      expenses,
      cumulativeNetFlow: runningNet,
    };
  });
}

export function buildSpendingData(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): SpendingData[] {
  const spending = new Map<
    string,
    { id: string; name: string; amount: number; color: string | null }
  >();

  for (const transaction of transactions) {
    const date = transactionDateKey(transaction);
    if (
      transaction.type.toLowerCase() !== "expense" ||
      !date ||
      date < range.start ||
      date > range.end
    ) {
      continue;
    }

    const amount = normalizedAmount(transaction.amount);
    if (amount === 0) continue;

    const id = transaction.categoryId || "uncategorized";
    const current = spending.get(id);
    const nextColor = isUsableColor(transaction.categoryColor) ?
      transaction.categoryColor
    : null;

    if (current) {
      current.amount += amount;
      if (!isUsableColor(current.color) && nextColor) current.color = nextColor;
    } else {
      spending.set(id, {
        id,
        name: transaction.categoryName.trim() || "Other",
        amount,
        color: nextColor,
      });
    }
  }

  return Array.from(spending.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      color: isUsableColor(item.color) ? item.color : DEFAULT_CATEGORY_COLOR,
    }))
    .sort((left, right) => right.amount - left.amount);
}

export function isUsableColor(
  color: string | null | undefined,
): color is string {
  return (
    typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
  );
}

export function calculateInvestmentMetrics(
  quantityValue: unknown,
  purchasePriceValue: unknown,
  currentPriceValue: unknown,
) {
  const quantity = toFiniteNumber(quantityValue);
  const purchasePrice = toFiniteNumber(purchasePriceValue);
  const currentPrice = toFiniteNumber(currentPriceValue);

  if (
    quantity === null ||
    purchasePrice === null ||
    currentPrice === null ||
    quantity < 0 ||
    purchasePrice < 0 ||
    currentPrice < 0
  ) {
    return null;
  }

  const invested = quantity * purchasePrice;
  const value = quantity * currentPrice;
  const pnl = value - invested;

  if (![invested, value, pnl].every(Number.isFinite)) return null;

  return {
    invested,
    value,
    pnl,
    pnlPct: invested > 0 ? roundTo((pnl / invested) * 100) : null,
  };
}

export function summarizeInvestmentPortfolio(
  investments: ReadonlyArray<AnalyticsInvestmentData>,
  displayLimit = 4,
): InvestmentPortfolioSummary {
  const safeMetric = (value: unknown) => toFiniteNumber(value) ?? 0;
  const sorted = [...investments].sort(
    (left, right) => safeMetric(right.value) - safeMetric(left.value),
  );

  return {
    totalValue: investments.reduce(
      (sum, item) => sum + safeMetric(item.value),
      0,
    ),
    totalInvested: investments.reduce(
      (sum, item) => sum + safeMetric(item.invested),
      0,
    ),
    totalPnl: investments.reduce(
      (sum, item) => sum + safeMetric(item.pnl),
      0,
    ),
    displayedHoldings: sorted.slice(0, Math.max(0, displayLimit)),
  };
}
