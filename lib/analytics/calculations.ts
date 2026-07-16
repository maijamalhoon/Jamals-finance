import {
  formatAppMonth,
  formatDateKey,
  getAppDateParts,
  getDaysInMonth,
} from "../dates";
import { FEATURE_COLOR_HEX } from "../theme-colors";

export type AnalyticsPresetPeriod =
  | "today"
  | "week"
  | "month"
  | "sixMonth"
  | "year";
export type AnalyticsPeriod = AnalyticsPresetPeriod | "custom";
export type ChangeSentiment = "positive" | "negative" | "neutral" | "warning";
export type ChangeDirection = "up" | "down" | null;
export type AnalyticsDataStatus = "available" | "error";
export type AnalyticsAccountStatus = "available" | "partial";

export interface AnalyticsTransactionData {
  id: string;
  amount: number | string | null;
  date: string;
  type: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  accountId?: string | null;
  accountName?: string | null;
  accountType?: string | null;
  sourceName?: string | null;
  personName?: string | null;
  itemName?: string | null;
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

export interface AnalyticsRangeSelection extends PeriodRanges {
  period: AnalyticsPeriod;
}

export interface AnalyticsSearchParams {
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
}

export interface ParsedAnalyticsSearch {
  selection: AnalyticsRangeSelection;
  wasReset: boolean;
}

export interface CustomRangeValidation {
  valid: boolean;
  startError: string | null;
  endError: string | null;
  rangeError: string | null;
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

export interface BreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface CategoryBreakdownItem extends BreakdownItem {
  color: string;
}

export interface AccountBreakdownItem extends BreakdownItem {
  type: string | null;
}

export interface IncomeSourceSummary {
  items: BreakdownItem[];
  totalAmount: number;
  totalEntries: number;
  explicitEntries: number;
}

export interface LargestEntry {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryName: string;
  accountName: string | null;
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

export interface PeriodFacts {
  inclusiveDays: number;
  incomeCount: number;
  expenseCount: number;
  averageDailyIncome: number;
  averageDailySpending: number;
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

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRESET_PERIODS = new Set<AnalyticsPresetPeriod>([
  "today",
  "week",
  "month",
  "sixMonth",
  "year",
]);

export const DEFAULT_CATEGORY_COLOR = FEATURE_COLOR_HEX.muted.toLowerCase();
export const OTHER_CATEGORIES_ID = "other-categories";
export const UNSPECIFIED_SOURCE = "Unspecified source";
export const UNKNOWN_ACCOUNT = "Unknown account";

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

export function shiftDateKey(dateKey: string, days: number) {
  const parsed = parseDateKey(dateKey);
  if (!parsed || !Number.isInteger(days)) return null;
  return toDateKey(shiftDays(parsed, days));
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

function maxDateKey(left: string, right: string) {
  return left >= right ? left : right;
}

export function getInclusiveDayCount(range: DateRange) {
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  if (!start || !end || range.start > range.end) return 0;
  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((endTime - startTime) / 86_400_000) + 1;
}

export function getPreviousCustomRange(range: DateRange): DateRange | null {
  const days = getInclusiveDayCount(range);
  const start = parseDateKey(range.start);
  if (!start || days < 1) return null;
  const previousEnd = shiftDays(start, -1);
  const previousStart = shiftDays(previousEnd, -(days - 1));
  return { start: toDateKey(previousStart), end: toDateKey(previousEnd) };
}

export function validateCustomRange(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date | string,
): CustomRangeValidation {
  const nowKey = toDateKey(getNowParts(now));
  const parsedStart = parseDateKey(start);
  const parsedEnd = parseDateKey(end);
  const startError =
    !start ? "Choose a start date."
    : !parsedStart ? "Enter a valid start date."
    : null;
  const endError =
    !end ? "Choose an end date."
    : !parsedEnd ? "Enter a valid end date."
    : end > nowKey ? "End date cannot be in the future."
    : null;
  const rangeError =
    !startError && !endError && start! > end! ?
      "Start date must be on or before the end date."
    : null;

  return {
    valid: !startError && !endError && !rangeError,
    startError,
    endError,
    rangeError,
  };
}

export function getCurrentAndPreviousRange(
  period: AnalyticsPresetPeriod,
  now: Date | string,
): PeriodRanges {
  const currentDate = getNowParts(now);
  const currentEnd = toDateKey(currentDate);

  if (period === "today") {
    const previous = toDateKey(shiftDays(currentDate, -1));
    return {
      current: { start: currentEnd, end: currentEnd },
      previous: { start: previous, end: previous },
    };
  }

  if (period === "week") {
    const currentStart = shiftDays(currentDate, -6);
    const previousEnd = shiftDays(currentStart, -1);
    const previousStart = shiftDays(previousEnd, -6);
    return {
      current: { start: toDateKey(currentStart), end: currentEnd },
      previous: { start: toDateKey(previousStart), end: toDateKey(previousEnd) },
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
      previous: {
        start: formatDateKey(previousStartMonth.year, previousStartMonth.month, 1),
        end: formatDateKey(
          previousEndMonth.year,
          previousEndMonth.month,
          clampDay(previousEndMonth.year, previousEndMonth.month, currentDate.day),
        ),
      },
    };
  }

  const previousYear = currentDate.year - 1;
  return {
    current: { start: formatDateKey(currentDate.year, 1, 1), end: currentEnd },
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

export function resolveAnalyticsRange(
  period: AnalyticsPeriod,
  now: Date | string,
  custom?: DateRange,
): AnalyticsRangeSelection | null {
  if (period !== "custom") {
    if (!PRESET_PERIODS.has(period)) return null;
    return { period, ...getCurrentAndPreviousRange(period, now) };
  }

  const validation = validateCustomRange(custom?.start, custom?.end, now);
  if (!validation.valid || !custom) return null;
  const previous = getPreviousCustomRange(custom);
  if (!previous) return null;
  return { period, current: { ...custom }, previous };
}

function singleSearchValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function parseAnalyticsSearchParams(
  params: AnalyticsSearchParams,
  now: Date | string,
): ParsedAnalyticsSearch {
  const rawPeriod = singleSearchValue(params.period);
  const rawFrom = singleSearchValue(params.from);
  const rawTo = singleSearchValue(params.to);
  const hasAnyParam = params.period !== undefined || params.from !== undefined || params.to !== undefined;
  const monthFallback = resolveAnalyticsRange("month", now)!;

  if (!hasAnyParam) return { selection: monthFallback, wasReset: false };
  if (!rawPeriod) return { selection: monthFallback, wasReset: true };

  if (rawPeriod === "custom") {
    const custom = rawFrom && rawTo ? { start: rawFrom, end: rawTo } : undefined;
    const selection = resolveAnalyticsRange("custom", now, custom);
    return selection ? { selection, wasReset: false } : { selection: monthFallback, wasReset: true };
  }

  if (!PRESET_PERIODS.has(rawPeriod as AnalyticsPresetPeriod) || rawFrom || rawTo) {
    return { selection: monthFallback, wasReset: true };
  }

  return {
    selection: resolveAnalyticsRange(rawPeriod as AnalyticsPresetPeriod, now)!,
    wasReset: false,
  };
}

export function getCombinedQueryRange(ranges: PeriodRanges): DateRange {
  return {
    start: minDateKey(ranges.current.start, ranges.previous.start),
    end: maxDateKey(ranges.current.end, ranges.previous.end),
  };
}

function formatShortDate(parts: CalendarDate, includeYear = false) {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function formatRangeLabel(range: DateRange) {
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  if (!start || !end) return "Invalid date range";
  if (range.start === range.end) return formatShortDate(start, true);
  const sameYear = start.year === end.year;
  return `${formatShortDate(start, !sameYear)} – ${formatShortDate(end, true)}`;
}

function buildBuckets(range: DateRange): Bucket[] {
  const start = parseDateKey(range.start);
  const end = parseDateKey(range.end);
  const days = getInclusiveDayCount(range);
  if (!start || !end || days < 1) return [];

  if (days <= 14) {
    return Array.from({ length: days }, (_, index) => {
      const day = shiftDays(start, index);
      const key = toDateKey(day);
      return { label: formatShortDate(day), start: key, end: key };
    });
  }

  if (days <= 90) {
    const buckets: Bucket[] = [];
    let cursor = start;
    while (toDateKey(cursor) <= range.end) {
      const bucketStart = toDateKey(cursor);
      const bucketEnd = minDateKey(toDateKey(shiftDays(cursor, 6)), range.end);
      const endParts = parseDateKey(bucketEnd)!;
      buckets.push({
        label: `${formatShortDate(cursor)}–${formatShortDate(endParts)}`,
        start: bucketStart,
        end: bucketEnd,
      });
      cursor = shiftDays(endParts, 1);
    }
    return buckets;
  }

  const buckets: Bucket[] = [];
  if (days <= 730) {
    let cursor = { year: start.year, month: start.month };
    while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
      buckets.push({
        label: formatAppMonth(cursor.year, cursor.month),
        start: maxDateKey(formatDateKey(cursor.year, cursor.month, 1), range.start),
        end: minDateKey(monthEnd(cursor.year, cursor.month), range.end),
      });
      cursor = shiftMonths(cursor, 1);
    }
    return buckets;
  }

  for (let year = start.year; year <= end.year; year += 1) {
    buckets.push({
      label: String(year),
      start: maxDateKey(formatDateKey(year, 1, 1), range.start),
      end: minDateKey(formatDateKey(year, 12, 31), range.end),
    });
  }
  return buckets;
}

export function buildDateBuckets(range: DateRange): DateRange[] & Bucket[] {
  return buildBuckets(range);
}

function normalizedAmount(value: unknown) {
  const amount = toFiniteNumber(value);
  return amount !== null && amount > 0 ? amount : 0;
}

function normalizedType(value: string) {
  const type = value.trim().toLowerCase();
  return type === "income" || type === "expense" ? type : null;
}

function transactionDateKey(transaction: AnalyticsTransactionData) {
  const parsed = parseDateKey(transaction.date);
  return parsed ? toDateKey(parsed) : null;
}

function isTransactionInRange(transaction: AnalyticsTransactionData, range: DateRange) {
  const date = transactionDateKey(transaction);
  return Boolean(date && date >= range.start && date <= range.end);
}

export function sumTransactions(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
  type: "income" | "expense",
) {
  return transactions.reduce((sum, transaction) => {
    if (!isTransactionInRange(transaction, range) || normalizedType(transaction.type) !== type) {
      return sum;
    }
    return sum + normalizedAmount(transaction.amount);
  }, 0);
}

function percentageChange(current: number, previous: number, favorableWhenIncreasing: boolean): ChangeResult {
  if (current === previous) {
    return { kind: "status", label: "No change", sentiment: "neutral", value: null };
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
  if (current > 0) return { kind: "status", label: "New", sentiment: "positive", value: null };
  return { kind: "status", label: "No change", sentiment: "neutral", value: null };
}

export function compareExpenses(current: number, previous: number): ChangeResult {
  if (previous > 0) return percentageChange(current, previous, false);
  if (current > 0) return { kind: "status", label: "New", sentiment: "negative", value: null };
  return { kind: "status", label: "No change", sentiment: "neutral", value: null };
}

export function compareNetSavings(current: number, previous: number): ChangeResult {
  if (previous > 0) return percentageChange(current, previous, true);
  if (current === previous) return { kind: "status", label: "No change", sentiment: "neutral", value: null };
  if (previous === 0 && current > 0) return { kind: "status", label: "New", sentiment: "positive", value: null };
  return current > previous ?
      { kind: "status", label: "Improved", sentiment: "positive", value: null }
    : { kind: "status", label: "Declined", sentiment: "negative", value: null };
}

export function compareSavingsRate(currentRate: number | null, previousRate: number | null): ChangeResult {
  if (previousRate === null) {
    if (currentRate === null) {
      return { kind: "status", label: "No previous activity", sentiment: "neutral", value: null };
    }
    return {
      kind: "status",
      label: "New",
      sentiment: currentRate > 0 ? "positive" : currentRate < 0 ? "negative" : "neutral",
      value: null,
    };
  }
  if (currentRate === null) {
    return { kind: "status", label: "No current income", sentiment: "warning", value: null };
  }
  const value = roundTo(currentRate - previousRate);
  if (value === 0) return { kind: "status", label: "No change", sentiment: "neutral", value: null };
  return {
    kind: "percentagePoints",
    label: `${value > 0 ? "+" : ""}${value} pp`,
    sentiment: value > 0 ? "positive" : "negative",
    value,
  };
}

export function getChangeDirection(change: ChangeResult): ChangeDirection {
  if (
    change.kind === "status" ||
    change.value === null ||
    !Number.isFinite(change.value) ||
    change.value === 0
  ) {
    return null;
  }

  return change.value > 0 ? "up" : "down";
}

function normalizedStableId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasPartialAccountMetadata(
  referencedAccountIds: ReadonlyArray<string | null | undefined>,
  returnedAccountIds: ReadonlyArray<string | null | undefined>,
) {
  const referenced = Array.from(
    new Set(referencedAccountIds.map(normalizedStableId).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  if (referenced.length === 0) return false;

  const returned = new Set(
    returnedAccountIds.map(normalizedStableId).filter(Boolean),
  );
  return referenced.some((id) => !returned.has(id));
}

export function calculateKpisForRanges(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  ranges: PeriodRanges,
): AnalyticsKpis {
  const totalIncome = sumTransactions(transactions, ranges.current, "income");
  const totalExpenses = sumTransactions(transactions, ranges.current, "expense");
  const previousIncome = sumTransactions(transactions, ranges.previous, "income");
  const previousExpenses = sumTransactions(transactions, ranges.previous, "expense");
  const netSavings = totalIncome - totalExpenses;
  const previousNetSavings = previousIncome - previousExpenses;
  const savingsRate = totalIncome > 0 ? roundTo((netSavings / totalIncome) * 100) : null;
  const previousSavingsRate = previousIncome > 0 ? roundTo((previousNetSavings / previousIncome) * 100) : null;

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

export function calculateKpis(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  period: AnalyticsPresetPeriod,
  now: Date | string,
) {
  return calculateKpisForRanges(transactions, getCurrentAndPreviousRange(period, now));
}

export function calculatePeriodFacts(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): PeriodFacts {
  const inclusiveDays = getInclusiveDayCount(range);
  let incomeCount = 0;
  let expenseCount = 0;

  for (const transaction of transactions) {
    if (!isTransactionInRange(transaction, range) || normalizedAmount(transaction.amount) === 0) continue;
    const type = normalizedType(transaction.type);
    if (type === "income") incomeCount += 1;
    if (type === "expense") expenseCount += 1;
  }

  const totalIncome = sumTransactions(transactions, range, "income");
  const totalExpenses = sumTransactions(transactions, range, "expense");
  return {
    inclusiveDays,
    incomeCount,
    expenseCount,
    averageDailyIncome: inclusiveDays > 0 ? totalIncome / inclusiveDays : 0,
    averageDailySpending: inclusiveDays > 0 ? totalExpenses / inclusiveDays : 0,
  };
}

export function buildCashFlowSeriesForRange(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): CashFlowPoint[] {
  let runningNet = 0;
  return buildBuckets(range).map((bucket) => {
    const income = sumTransactions(transactions, bucket, "income");
    const expenses = sumTransactions(transactions, bucket, "expense");
    runningNet += income - expenses;
    return { ...bucket, income, expenses, cumulativeNetFlow: runningNet };
  });
}

export function buildCashFlowSeries(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  period: AnalyticsPresetPeriod,
  now: Date | string,
) {
  return buildCashFlowSeriesForRange(transactions, getCurrentAndPreviousRange(period, now).current);
}

export function buildCashFlowSummary(points: ReadonlyArray<CashFlowPoint>) {
  if (points.length === 0) return "No cash-flow activity is available for this range.";
  const income = points.reduce((sum, point) => sum + point.income, 0);
  const expenses = points.reduce((sum, point) => sum + point.expenses, 0);
  const net = income - expenses;
  return `${points.length} chronological buckets. Total income ${income}; total expenses ${expenses}; net cash flow ${net}.`;
}

export function isUsableColor(color: string | null | undefined): color is string {
  return typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
}

export function buildSpendingData(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): SpendingData[] {
  const spending = new Map<string, { id: string; name: string; amount: number; color: string | null }>();

  for (const transaction of transactions) {
    if (!isTransactionInRange(transaction, range) || normalizedType(transaction.type) !== "expense") continue;
    const amount = normalizedAmount(transaction.amount);
    if (amount === 0) continue;
    const id = transaction.categoryId?.trim() || "uncategorized";
    const current = spending.get(id);
    const nextColor = isUsableColor(transaction.categoryColor) ? transaction.categoryColor : null;
    if (current) {
      current.amount += amount;
      if (!isUsableColor(current.color) && nextColor) current.color = nextColor;
    } else {
      spending.set(id, {
        id,
        name: transaction.categoryName?.trim() || "Other",
        amount,
        color: nextColor,
      });
    }
  }

  const categories = Array.from(spending.values())
    .map((item) => ({ ...item, color: isUsableColor(item.color) ? item.color : DEFAULT_CATEGORY_COLOR }))
    .sort((left, right) => right.amount - left.amount || left.id.localeCompare(right.id));
  if (categories.length <= 5) return categories;
  const topCategories = categories.slice(0, 4);
  const otherAmount = categories.slice(4).reduce((sum, category) => sum + category.amount, 0);
  return [
    ...topCategories,
    { id: OTHER_CATEGORIES_ID, name: "Other categories", amount: otherAmount, color: DEFAULT_CATEGORY_COLOR },
  ];
}

export function calculateRoundedPercentages(amounts: ReadonlyArray<number>, decimals = 1) {
  const safeAmounts = amounts.map((amount) => (Number.isFinite(amount) && amount > 0 ? amount : 0));
  const total = safeAmounts.reduce((sum, amount) => sum + amount, 0);
  if (total === 0) return safeAmounts.map(() => 0);
  const factor = 10 ** decimals;
  const target = 100 * factor;
  const rawUnits = safeAmounts.map((amount) => (amount / total) * target);
  const units = rawUnits.map(Math.floor);
  let remaining = target - units.reduce((sum, value) => sum + value, 0);
  const order = rawUnits
    .map((value, index) => ({ index, remainder: value - units[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remaining > 0; index = (index + 1) % order.length) {
    units[order[index].index] += 1;
    remaining -= 1;
  }
  return units.map((value) => value / factor);
}

function withPercentages<T extends { amount: number }>(items: T[]) {
  const percentages = calculateRoundedPercentages(items.map((item) => item.amount));
  return items.map((item, index) => ({ ...item, percentage: percentages[index] }));
}

export function buildExpenseCategoryBreakdown(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): CategoryBreakdownItem[] {
  return withPercentages(buildSpendingData(transactions, range));
}

export function buildIncomeSourceSummary(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): IncomeSourceSummary {
  const sources = new Map<string, { id: string; name: string; amount: number }>();
  let totalEntries = 0;
  let explicitEntries = 0;

  for (const transaction of transactions) {
    if (!isTransactionInRange(transaction, range) || normalizedType(transaction.type) !== "income") continue;
    const amount = normalizedAmount(transaction.amount);
    if (amount === 0) continue;
    totalEntries += 1;
    const explicit = transaction.sourceName?.trim() || "";
    if (explicit) explicitEntries += 1;
    const name = explicit || UNSPECIFIED_SOURCE;
    const id = explicit ? `source:${explicit.toLocaleLowerCase("en")}` : "source:unspecified";
    const current = sources.get(id);
    if (current) current.amount += amount;
    else sources.set(id, { id, name, amount });
  }

  const sorted = Array.from(sources.values()).sort(
    (left, right) => right.amount - left.amount || left.name.localeCompare(right.name),
  );
  const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);
  return { items: withPercentages(sorted), totalAmount, totalEntries, explicitEntries };
}

export function buildAccountBreakdown(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
): AccountBreakdownItem[] {
  const accounts = new Map<string, { id: string; name: string; type: string | null; amount: number }>();
  for (const transaction of transactions) {
    if (!isTransactionInRange(transaction, range) || normalizedType(transaction.type) !== "expense") continue;
    const amount = normalizedAmount(transaction.amount);
    if (amount === 0) continue;
    const storedId = transaction.accountId?.trim() || "";
    const id = storedId || "account:unknown";
    const current = accounts.get(id);
    if (current) current.amount += amount;
    else {
      accounts.set(id, {
        id,
        name: transaction.accountName?.trim() || UNKNOWN_ACCOUNT,
        type: transaction.accountType?.trim() || null,
        amount,
      });
    }
  }
  return withPercentages(
    Array.from(accounts.values()).sort(
      (left, right) => right.amount - left.amount || left.id.localeCompare(right.id),
    ),
  );
}

export function getLargestEntries(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  range: DateRange,
  type: "income" | "expense",
  limit = 5,
): LargestEntry[] {
  return transactions
    .flatMap((transaction) => {
      if (!isTransactionInRange(transaction, range) || normalizedType(transaction.type) !== type) return [];
      const amount = normalizedAmount(transaction.amount);
      if (amount === 0) return [];
      const categoryName = transaction.categoryName?.trim() || "Other";
      const title =
        transaction.itemName?.trim() ||
        transaction.personName?.trim() ||
        categoryName ||
        (type === "expense" ? "Expense" : "Income");
      return [{
        id: transaction.id,
        title,
        amount,
        date: transactionDateKey(transaction)!,
        categoryName,
        accountName: transaction.accountName?.trim() || null,
      }];
    })
    .sort((left, right) => right.amount - left.amount || right.date.localeCompare(left.date) || left.id.localeCompare(right.id))
    .slice(0, Math.max(0, limit));
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
    quantity === null || purchasePrice === null || currentPrice === null ||
    quantity < 0 || purchasePrice < 0 || currentPrice < 0
  ) return null;
  const invested = quantity * purchasePrice;
  const value = quantity * currentPrice;
  const pnl = value - invested;
  if (![invested, value, pnl].every(Number.isFinite)) return null;
  return { invested, value, pnl, pnlPct: invested > 0 ? roundTo((pnl / invested) * 100) : null };
}

export function summarizeInvestmentPortfolio(
  investments: ReadonlyArray<AnalyticsInvestmentData>,
  displayLimit = 4,
): InvestmentPortfolioSummary {
  const safeMetric = (value: unknown) => toFiniteNumber(value) ?? 0;
  const sorted = [...investments].sort(
    (left, right) => safeMetric(right.value) - safeMetric(left.value) || left.id.localeCompare(right.id),
  );
  return {
    totalValue: investments.reduce((sum, item) => sum + safeMetric(item.value), 0),
    totalInvested: investments.reduce((sum, item) => sum + safeMetric(item.invested), 0),
    totalPnl: investments.reduce((sum, item) => sum + safeMetric(item.pnl), 0),
    displayedHoldings: sorted.slice(0, Math.max(0, displayLimit)),
  };
}
