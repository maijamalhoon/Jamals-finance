import type { LoadedTransaction } from "@/lib/transactions";

export type TransactionBreakdownIdentity = {
  id: string;
  name: string;
  color: string;
};

export type TransactionPageSummary = {
  thisMonth: number;
  thisYear: number;
  recordMonthAmount: number;
  recordMonthLabel: string;
  thisMonthEntryCount: number;
  monthlySeries: Array<{ key: string; label: string; amount: number }>;
  breakdownItems: Array<{
    id: string;
    name: string;
    color: string;
    amount: number;
    count: number;
  }>;
  accountItems: Array<{ name: string; amount: number; count: number }>;
};

function safeAmount(value: number | string | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function shortMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function fullMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return "No activity";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function buildTransactionPageSummary(
  transactions: LoadedTransaction[],
  now: { year: number; month: number; day: number },
  getBreakdownIdentity: (
    transaction: LoadedTransaction,
  ) => TransactionBreakdownIdentity,
): TransactionPageSummary {
  const currentMonthKey = monthKey(now.year, now.month);
  const currentYearPrefix = `${now.year}-`;
  const totalsByMonth = new Map<string, number>();
  const breakdown = new Map<
    string,
    { id: string; name: string; color: string; amount: number; count: number }
  >();
  const accounts = new Map<string, { name: string; amount: number; count: number }>();

  let thisMonth = 0;
  let thisYear = 0;
  let thisMonthEntryCount = 0;

  for (const transaction of transactions) {
    const amount = safeAmount(transaction.amount);
    const date = typeof transaction.date === "string" ? transaction.date : "";
    if (amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const transactionMonth = date.slice(0, 7);
    totalsByMonth.set(
      transactionMonth,
      (totalsByMonth.get(transactionMonth) ?? 0) + amount,
    );

    if (date.startsWith(currentYearPrefix)) thisYear += amount;

    const accountName = transaction.accounts?.name?.trim() || "No account";
    const currentAccount = accounts.get(accountName) ?? {
      name: accountName,
      amount: 0,
      count: 0,
    };
    currentAccount.amount += amount;
    currentAccount.count += 1;
    accounts.set(accountName, currentAccount);

    if (transactionMonth !== currentMonthKey) continue;

    thisMonth += amount;
    thisMonthEntryCount += 1;
    const identity = getBreakdownIdentity(transaction);
    const currentBreakdown = breakdown.get(identity.id) ?? {
      ...identity,
      amount: 0,
      count: 0,
    };
    currentBreakdown.amount += amount;
    currentBreakdown.count += 1;
    breakdown.set(identity.id, currentBreakdown);
  }

  const recordMonth = Array.from(totalsByMonth.entries()).sort(
    (left, right) => right[1] - left[1] || right[0].localeCompare(left[0]),
  )[0];

  const monthlySeries = Array.from({ length: 6 }, (_, index) => {
    const shifted = shiftMonth(now.year, now.month, index - 5);
    const key = monthKey(shifted.year, shifted.month);
    return {
      key,
      label: shortMonthLabel(shifted.year, shifted.month),
      amount: totalsByMonth.get(key) ?? 0,
    };
  });

  return {
    thisMonth,
    thisYear,
    recordMonthAmount: recordMonth?.[1] ?? 0,
    recordMonthLabel: recordMonth ? fullMonthLabel(recordMonth[0]) : "No activity yet",
    thisMonthEntryCount,
    monthlySeries,
    breakdownItems: Array.from(breakdown.values()).sort(
      (left, right) => right.amount - left.amount || left.name.localeCompare(right.name),
    ),
    accountItems: Array.from(accounts.values()).sort(
      (left, right) => right.amount - left.amount || left.name.localeCompare(right.name),
    ),
  };
}
