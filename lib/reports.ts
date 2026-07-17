export interface ReportCategoryRelation {
  name?: string | null;
  color?: string | null;
}

export interface ReportTransactionInput {
  id?: string | null;
  type?: string | null;
  amount?: number | string | null;
  date?: string | null;
  categories?:
    | ReportCategoryRelation
    | ReportCategoryRelation[]
    | null;
}

export interface MonthlyReportPoint {
  key: string;
  month: string;
  income: number;
  expenses: number;
}

export interface ReportCategoryPoint {
  name: string;
  amount: number;
  color: string;
  pct: number;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DEFAULT_CATEGORY_COLOR = "#ef4444";

function parseDateKey(value: string) {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function monthKey(year: number, monthIndex: number) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function firstCategory(
  value: ReportTransactionInput["categories"],
): ReportCategoryRelation | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function toPositiveAmount(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getReportStartDate(todayKey: string, monthCount = 6) {
  const today = parseDateKey(todayKey);
  if (!today || !Number.isInteger(monthCount) || monthCount < 1) return null;

  return `${monthKey(today.year, today.month - monthCount)}-01`;
}

export function buildReport(
  rows: ReportTransactionInput[],
  todayKey: string,
  monthCount = 6,
) {
  const today = parseDateKey(todayKey);
  const startDate = getReportStartDate(todayKey, monthCount);

  if (!today || !startDate) {
    return {
      monthly: [] as MonthlyReportPoint[],
      categories: [] as ReportCategoryPoint[],
      currentIncome: 0,
      currentExpenses: 0,
      currentNet: 0,
      entryCount: 0,
    };
  }

  const monthly = Array.from({ length: monthCount }, (_, index) => {
    const offset = index - (monthCount - 1);
    const date = new Date(Date.UTC(today.year, today.month - 1 + offset, 1));
    return {
      key: monthKey(date.getUTCFullYear(), date.getUTCMonth()),
      month: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      income: 0,
      expenses: 0,
    };
  });
  const monthlyByKey = new Map(monthly.map((point) => [point.key, point]));
  const currentMonthKey = todayKey.slice(0, 7);
  const categoryTotals = new Map<
    string,
    { name: string; amount: number; color: string }
  >();
  let entryCount = 0;

  for (const row of rows) {
    const id = row.id?.trim();
    const type = row.type?.trim().toLowerCase();
    const date = row.date?.trim() ?? "";
    const amount = toPositiveAmount(row.amount);
    const point = monthlyByKey.get(date.slice(0, 7));

    if (
      !id ||
      !parseDateKey(date) ||
      !amount ||
      date < startDate ||
      date > todayKey ||
      !point ||
      (type !== "income" && type !== "expense" && type !== "refund")
    ) {
      continue;
    }

    if (type === "income") point.income += amount;
    if (type === "expense") point.expenses += amount;
    if (type === "refund") point.expenses -= amount;
    entryCount += 1;

    if ((type === "expense" || type === "refund") && date.startsWith(currentMonthKey)) {
      const category = firstCategory(row.categories);
      const name = category?.name?.trim() || "Other";
      const existing = categoryTotals.get(name);
      categoryTotals.set(name, {
        name,
        amount: (existing?.amount ?? 0) + (type === "refund" ? -amount : amount),
        color: category?.color?.trim() || existing?.color || DEFAULT_CATEGORY_COLOR,
      });
    }
  }

  const current = monthly.at(-1) ?? { income: 0, expenses: 0 };
  const categories = Array.from(categoryTotals.values())
    .filter((category) => category.amount > 0)
    .sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name))
    .map((category) => ({
      ...category,
      pct:
        current.expenses > 0 ? (category.amount / current.expenses) * 100 : 0,
    }));

  return {
    monthly,
    categories,
    currentIncome: current.income,
    currentExpenses: current.expenses,
    currentNet: current.income - current.expenses,
    entryCount,
  };
}
