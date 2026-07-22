import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { formatDateKey, getAppMonthRange, getDaysInMonth } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";

export const dynamic = "force-dynamic";

const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const UNAVAILABLE_MESSAGE =
  "AI insights are temporarily unavailable. Secure local finance intelligence remains available.";
const SUPPORTED_CURRENCIES = new Set([
  "PKR",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
]);

type InsightType = "positive" | "warning" | "tip";
type SummaryTone = "positive" | "warning" | "danger" | "info" | "neutral";
type ActionPriority = "high" | "medium" | "low";

type CurrencyContext = {
  currency: string;
  pkrToDisplayRate: number;
  rateLive: boolean;
};

type FinanceSummary = {
  baseCurrency: "PKR";
  displayCurrency: string;
  period: {
    currentMonth: string;
    currentMonthStart: string;
    currentMonthEnd: string;
  };
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    cashBalance: number;
    investmentValue: number;
    payableRemaining: number;
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
    completedCount: number;
    totalTarget: number;
    totalSaved: number;
    completionPct: number;
  };
  investmentSummary: {
    count: number;
    totalInvested: number;
    currentValue: number;
    totalPnL: number;
    totalPnLPct: number;
    byType: { type: string; currentValue: number; totalInvested: number }[];
  };
  payablesSummary: {
    count: number;
    totalOriginal: number;
    paid: number;
    remaining: number;
    overdueCount: number;
  };
  recentTrendTotals: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
};

type Insight = {
  type: InsightType;
  title: string;
  message: string;
};

type SuggestedAction = {
  title: string;
  description: string;
  priority: ActionPriority;
};

type SummaryCard = {
  label: string;
  value: string;
  caption: string;
  tone: SummaryTone;
};

type GeneratedInsights = {
  healthScore: number;
  healthLabel: string;
  insights: Insight[];
  suggestedActions: SuggestedAction[];
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
};

type RawCategory = {
  name?: string | null;
};

type RawTransaction = {
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
  categories?: RawCategory | RawCategory[] | null;
};

type RawGoal = {
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  status?: string | null;
};

type RawInvestment = {
  type?: string | null;
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
};

type RawPayable = {
  original_value?: number | string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};

type RawAccount = {
  balance?: number | string | null;
};

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? "";
}

function createBearerClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Native AI server configuration is unavailable.");
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function authenticatedClient(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: json(
        {
          error: "authentication_required",
          message: "Please log in before using AI insights.",
        },
        401,
      ),
    };
  }

  const supabase = createBearerClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      ok: false as const,
      response: json(
        {
          error: "authentication_required",
          message: "Your secure session has expired. Please sign in again.",
        },
        401,
      ),
    };
  }

  return { ok: true as const, supabase };
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rounded(value: number) {
  const result = Math.round(value);
  return Object.is(result, -0) ? 0 : result;
}

function roundedPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  const result = Number(value.toFixed(1));
  return Object.is(result, -0) ? 0 : result;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, maxLength);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function categoryName(
  relation: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(relation) ? relation[0] : relation;
  return selected?.name?.trim() || "Other";
}

function parseCurrencyContext(request: NextRequest, body?: unknown): CurrencyContext {
  const bodyRecord = isRecord(body) ? body : null;
  const currency =
    (bodyRecord && typeof bodyRecord.currency === "string"
      ? bodyRecord.currency
      : request.nextUrl.searchParams.get("currency")) || "PKR";
  const rawRate =
    bodyRecord &&
    (typeof bodyRecord.rate === "number" || typeof bodyRecord.rate === "string")
      ? Number(bodyRecord.rate)
      : Number(request.nextUrl.searchParams.get("rate"));
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 1;
  const rateLive =
    bodyRecord?.rateLive === true ||
    request.nextUrl.searchParams.get("rateLive") === "true";

  const normalizedCurrency = currency
    .replace(/[^A-Z]/gi, "")
    .toUpperCase()
    .slice(0, 3);

  return {
    currency: SUPPORTED_CURRENCIES.has(normalizedCurrency)
      ? normalizedCurrency
      : "PKR",
    pkrToDisplayRate: rate,
    rateLive,
  };
}

function formatDisplayMoney(valuePkr: number, context: CurrencyContext) {
  const value = valuePkr * context.pkrToDisplayRate;
  const digits = context.currency === "JPY" ? 0 : 2;
  return new Intl.NumberFormat(
    context.currency === "PKR"
      ? "en-PK"
      : context.currency === "INR"
        ? "en-IN"
        : "en-US",
    {
      style: "currency",
      currency: context.currency,
      currencyDisplay:
        context.currency === "PKR" || context.currency === "CNY"
          ? "code"
          : "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    },
  ).format(value);
}

function monthRanges(year: number, month: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = year * 12 + month - 1 - (count - 1 - index);
    const rangeYear = Math.floor(monthIndex / 12);
    const rangeMonth = (monthIndex % 12) + 1;
    return {
      key: `${rangeYear}-${String(rangeMonth).padStart(2, "0")}`,
      firstDay: formatDateKey(rangeYear, rangeMonth, 1),
      lastDay: formatDateKey(
        rangeYear,
        rangeMonth,
        getDaysInMonth(rangeYear, rangeMonth),
      ),
    };
  });
}

async function safeRows<T>(
  label: string,
  request: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const { data, error } = await request;
  if (error) {
    console.error(`[native-ai] ${label} query failed`);
    return [] as T[];
  }
  return data ?? [];
}

async function buildFinanceSummary(supabase: SupabaseClient) {
  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const trends = monthRanges(year, month, 3);
  const oldest = trends[0]?.firstDay ?? firstDay;

  const [
    transactions,
    goals,
    investments,
    payables,
    accounts,
  ] = await Promise.all([
    safeRows<RawTransaction>(
      "transactions",
      supabase
        .from("transactions")
        .select("amount,date,type,categories(name)")
        .is("deleted_at", null)
        .gte("date", oldest)
        .lte("date", lastDay),
    ),
    safeRows<RawGoal>(
      "goals",
      supabase.from("goals").select("current_amount,target_amount,status"),
    ),
    safeRows<RawInvestment>(
      "investments",
      supabase
        .from("investments")
        .select("type,quantity,purchase_price,current_price"),
    ),
    safeRows<RawPayable>(
      "payables",
      supabase
        .from("liabilities")
        .select("original_value,paid_amount,remaining_amount,due_date,status"),
    ),
    safeRows<RawAccount>(
      "accounts",
      supabase.from("accounts").select("balance").eq("status", "active"),
    ),
  ]);

  const currentRows = transactions.filter(
    (transaction) =>
      typeof transaction.date === "string" &&
      transaction.date >= firstDay &&
      transaction.date <= lastDay,
  );
  const currentIncome = currentRows
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const currentGrossExpenses = currentRows
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const currentRefunds = currentRows
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const currentExpenses = currentGrossExpenses - currentRefunds;

  const categoryTotals = new Map<string, number>();
  currentRows
    .filter(
      (transaction) =>
        transaction.type === "expense" || transaction.type === "refund",
    )
    .forEach((transaction) => {
      const name = categoryName(transaction.categories);
      const direction = transaction.type === "refund" ? -1 : 1;
      categoryTotals.set(
        name,
        (categoryTotals.get(name) ?? 0) +
          direction * numberValue(transaction.amount),
      );
    });

  const recentTrendTotals = trends.map((range) => {
    const rows = transactions.filter(
      (transaction) =>
        typeof transaction.date === "string" &&
        transaction.date >= range.firstDay &&
        transaction.date <= range.lastDay,
    );
    const income = rows
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const grossExpenses = rows
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const refunds = rows
      .filter((transaction) => transaction.type === "refund")
      .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
    const expenses = grossExpenses - refunds;
    return {
      month: range.key,
      income: rounded(income),
      expenses: rounded(expenses),
      net: rounded(income - expenses),
    };
  });

  const totalTarget = goals.reduce(
    (sum, goal) => sum + numberValue(goal.target_amount),
    0,
  );
  const totalSaved = goals.reduce(
    (sum, goal) => sum + numberValue(goal.current_amount),
    0,
  );
  const completedCount = goals.filter(
    (goal) =>
      goal.status === "completed" ||
      (numberValue(goal.target_amount) > 0 &&
        numberValue(goal.current_amount) >= numberValue(goal.target_amount)),
  ).length;

  let totalInvested = 0;
  let investmentValue = 0;
  const byType = new Map<
    string,
    { type: string; currentValue: number; totalInvested: number }
  >();
  investments.forEach((investment) => {
    const quantity = numberValue(investment.quantity);
    const invested = quantity * numberValue(investment.purchase_price);
    const current = quantity * numberValue(investment.current_price);
    const type = titleCase(investment.type || "Other") || "Other";
    const entry = byType.get(type) ?? {
      type,
      currentValue: 0,
      totalInvested: 0,
    };
    entry.currentValue += current;
    entry.totalInvested += invested;
    byType.set(type, entry);
    totalInvested += invested;
    investmentValue += current;
  });

  const normalizedPayables = payables.map((payable) => ({
    ...payable,
    resolvedStatus: getPayableStatus({
      status: payable.status ?? "pending",
      remaining_amount: numberValue(payable.remaining_amount),
      due_date: payable.due_date ?? null,
    }),
  }));
  const payableOriginal = normalizedPayables.reduce(
    (sum, payable) => sum + numberValue(payable.original_value),
    0,
  );
  const payablePaid = normalizedPayables.reduce(
    (sum, payable) => sum + numberValue(payable.paid_amount),
    0,
  );
  const payableRemaining = normalizedPayables.reduce(
    (sum, payable) => sum + numberValue(payable.remaining_amount),
    0,
  );
  const cashBalance = accounts.reduce(
    (sum, account) => sum + numberValue(account.balance),
    0,
  );

  const summary: FinanceSummary = {
    baseCurrency: "PKR",
    displayCurrency: "PKR",
    period: {
      currentMonth: `${year}-${String(month).padStart(2, "0")}`,
      currentMonthStart: firstDay,
      currentMonthEnd: lastDay,
    },
    currentMonth: {
      income: rounded(currentIncome),
      expenses: rounded(currentExpenses),
      net: rounded(currentIncome - currentExpenses),
      savingsRate:
        currentIncome > 0
          ? roundedPct(
              ((currentIncome - currentExpenses) / currentIncome) * 100,
            )
          : 0,
    },
    netBalance: {
      cashBalance: rounded(cashBalance),
      investmentValue: rounded(investmentValue),
      payableRemaining: rounded(payableRemaining),
      estimatedNetWorth: rounded(
        cashBalance + investmentValue - payableRemaining,
      ),
    },
    categorySpendingTotals: Array.from(categoryTotals.entries())
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount: rounded(amount) }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 8),
    goalsSummary: {
      count: goals.length,
      completedCount,
      totalTarget: rounded(totalTarget),
      totalSaved: rounded(totalSaved),
      completionPct:
        totalTarget > 0 ? roundedPct((totalSaved / totalTarget) * 100) : 0,
    },
    investmentSummary: {
      count: investments.length,
      totalInvested: rounded(totalInvested),
      currentValue: rounded(investmentValue),
      totalPnL: rounded(investmentValue - totalInvested),
      totalPnLPct:
        totalInvested > 0
          ? roundedPct(
              ((investmentValue - totalInvested) / totalInvested) * 100,
            )
          : 0,
      byType: Array.from(byType.values())
        .map((entry) => ({
          type: entry.type,
          currentValue: rounded(entry.currentValue),
          totalInvested: rounded(entry.totalInvested),
        }))
        .sort((left, right) => right.currentValue - left.currentValue)
        .slice(0, 6),
    },
    payablesSummary: {
      count: normalizedPayables.length,
      totalOriginal: rounded(payableOriginal),
      paid: rounded(payablePaid),
      remaining: rounded(payableRemaining),
      overdueCount: normalizedPayables.filter(
        (payable) => payable.resolvedStatus === "overdue",
      ).length,
    },
    recentTrendTotals,
  };

  const hasFinanceData =
    transactions.length > 0 ||
    goals.length > 0 ||
    investments.length > 0 ||
    payables.length > 0 ||
    accounts.some((account) => numberValue(account.balance) !== 0);

  return { summary, hasFinanceData };
}

function summaryCards(
  summary: FinanceSummary,
  context: CurrencyContext,
): SummaryCard[] {
  const previous = summary.recentTrendTotals.at(-2);
  const expenseDelta = previous
    ? summary.currentMonth.expenses - previous.expenses
    : 0;

  return [
    {
      label: "Month income",
      value: formatDisplayMoney(summary.currentMonth.income, context),
      caption: `${summary.currentMonth.savingsRate}% savings rate`,
      tone: summary.currentMonth.income > 0 ? "positive" : "neutral",
    },
    {
      label: "Month expenses",
      value: formatDisplayMoney(summary.currentMonth.expenses, context),
      caption:
        previous && expenseDelta !== 0
          ? `${formatDisplayMoney(Math.abs(expenseDelta), context)} ${
              expenseDelta > 0 ? "above" : "below"
            } last month`
          : "Current month spending",
      tone: expenseDelta > 0 ? "warning" : "info",
    },
    {
      label: "Net balance",
      value: formatDisplayMoney(
        summary.netBalance.estimatedNetWorth,
        context,
      ),
      caption: `${formatDisplayMoney(
        summary.netBalance.cashBalance,
        context,
      )} cash balance`,
      tone:
        summary.netBalance.estimatedNetWorth >= 0 ? "positive" : "danger",
    },
    {
      label: "Payables due",
      value: formatDisplayMoney(summary.payablesSummary.remaining, context),
      caption: `${summary.payablesSummary.overdueCount} overdue record${
        summary.payablesSummary.overdueCount === 1 ? "" : "s"
      }`,
      tone:
        summary.payablesSummary.overdueCount > 0 ? "danger" : "neutral",
    },
  ];
}

function fallbackInsights(
  summary: FinanceSummary,
  context: CurrencyContext,
): GeneratedInsights {
  const savingsScore = Math.max(
    0,
    Math.min(45, 25 + summary.currentMonth.savingsRate),
  );
  const goalsScore = Math.min(25, summary.goalsSummary.completionPct / 4);
  const payableScore =
    summary.payablesSummary.remaining > 0
      ? Math.max(0, 20 - summary.payablesSummary.overdueCount * 8)
      : 20;
  const investmentScore =
    summary.investmentSummary.currentValue > 0 ? 10 : 4;
  const healthScore = Math.round(
    Math.max(
      25,
      Math.min(
        95,
        savingsScore + goalsScore + payableScore + investmentScore,
      ),
    ),
  );
  const topCategory = summary.categorySpendingTotals[0];

  return {
    healthScore,
    healthLabel:
      healthScore >= 80
        ? "Excellent"
        : healthScore >= 65
          ? "Good"
          : healthScore >= 45
            ? "Fair"
            : "Needs Attention",
    insights: [
      {
        type: summary.currentMonth.net >= 0 ? "positive" : "warning",
        title:
          summary.currentMonth.net >= 0
            ? "Positive monthly net"
            : "Monthly net needs attention",
        message:
          summary.currentMonth.net >= 0
            ? `This month is ahead by ${formatDisplayMoney(
                summary.currentMonth.net,
                context,
              )} after expenses.`
            : `This month is short by ${formatDisplayMoney(
                Math.abs(summary.currentMonth.net),
                context,
              )}; review flexible spending first.`,
      },
      {
        type: topCategory ? "tip" : "warning",
        title: topCategory
          ? `${topCategory.category} is the top category`
          : "No category spending yet",
        message: topCategory
          ? `${topCategory.category} reached ${formatDisplayMoney(
              topCategory.amount,
              context,
            )} this month.`
          : "Add categorized expenses to receive stronger spending guidance.",
      },
      {
        type: summary.goalsSummary.count > 0 ? "positive" : "tip",
        title: "Goal progress",
        message:
          summary.goalsSummary.count > 0
            ? `Goals are ${summary.goalsSummary.completionPct}% funded across ${
                summary.goalsSummary.count
              } target${
                summary.goalsSummary.count === 1 ? "" : "s"
              }.`
            : "Create one savings goal to make monthly surplus easier to direct.",
      },
      {
        type:
          summary.payablesSummary.overdueCount > 0 ? "warning" : "tip",
        title: "Payables check",
        message:
          summary.payablesSummary.remaining > 0
            ? `${formatDisplayMoney(
                summary.payablesSummary.remaining,
                context,
              )} remains payable, with ${
                summary.payablesSummary.overdueCount
              } overdue record${
                summary.payablesSummary.overdueCount === 1 ? "" : "s"
              }.`
            : "No outstanding payable balance is currently visible.",
      },
    ],
    suggestedActions: [
      {
        title:
          summary.currentMonth.net >= 0
            ? "Allocate monthly surplus"
            : "Reduce the biggest category",
        description:
          summary.currentMonth.net >= 0
            ? "Move a clear amount from this month's surplus into goals or investments."
            : topCategory
              ? `Start with ${topCategory.category}, the largest current expense category.`
              : "Review recent expenses and pause non-essential spending.",
        priority: summary.currentMonth.net >= 0 ? "medium" : "high",
      },
      {
        title: "Review payable commitments",
        description:
          summary.payablesSummary.remaining > 0
            ? "Prioritize overdue and high remaining payables before adding new obligations."
            : "Keep payables clean by recording repayments as soon as they happen.",
        priority:
          summary.payablesSummary.overdueCount > 0 ? "high" : "low",
      },
      {
        title: "Keep trend tracking current",
        description:
          "Refresh categories and account balances so insights can compare month-to-month movement.",
        priority: "medium",
      },
    ],
  };
}

function parseInsightType(value: unknown): InsightType {
  return value === "positive" || value === "warning" || value === "tip"
    ? value
    : "tip";
}

function parsePriority(value: unknown): ActionPriority {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function parseGeneratedInsights(text: string): GeneratedInsights | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (
    typeof parsed.healthScore !== "number" ||
    !Number.isFinite(parsed.healthScore) ||
    typeof parsed.healthLabel !== "string" ||
    !Array.isArray(parsed.insights) ||
    !Array.isArray(parsed.suggestedActions)
  ) {
    return null;
  }

  const insights = parsed.insights
    .map((entry): Insight | null => {
      if (!isRecord(entry)) return null;
      return {
        type: parseInsightType(entry.type),
        title: cleanText(entry.title, "Finance insight", 90),
        message: cleanText(
          entry.message,
          "Review your latest finance summary.",
          280,
        ),
      };
    })
    .filter((entry): entry is Insight => Boolean(entry))
    .slice(0, 4);
  const actions = parsed.suggestedActions
    .map((entry): SuggestedAction | null => {
      if (!isRecord(entry)) return null;
      return {
        title: cleanText(entry.title, "Review finances", 90),
        description: cleanText(
          entry.description,
          "Review the latest summary and choose the next step.",
          260,
        ),
        priority: parsePriority(entry.priority),
      };
    })
    .filter((entry): entry is SuggestedAction => Boolean(entry))
    .slice(0, 5);

  if (insights.length === 0 || actions.length === 0) return null;
  return {
    healthScore: Math.max(
      0,
      Math.min(100, Math.round(parsed.healthScore)),
    ),
    healthLabel: cleanText(parsed.healthLabel, "Fair", 40),
    insights,
    suggestedActions: actions,
  };
}

function parseChat(text: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const answer = cleanText(
    parsed.answer,
    "I could not prepare a finance answer right now.",
    900,
  );
  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps
        .map((value) => cleanText(value, "", 90))
        .filter(Boolean)
        .slice(0, 3)
    : [];
  return { answer, followUps };
}

function geminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    model:
      process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
      GEMINI_MODEL_FALLBACK,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
) {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok || payload.error) {
    throw new Error(
      `Gemini request failed: ${
        payload.error?.status ?? response.status
      }`,
    );
  }
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

function insightPrompt(
  summary: FinanceSummary,
  context: CurrencyContext,
) {
  return `You are the private finance assistant inside Jamal's Finance native app.
Use only the summarized data below. Never invent transactions, account names, people, dates, or financial facts.
Stored values are PKR. Display currency is ${context.currency}. One PKR equals ${context.pkrToDisplayRate} ${context.currency}. ${
    context.rateLive
      ? "The conversion rate is live."
      : "The conversion rate may be approximate."
  }
Be concise, practical and privacy-aware.

Summary:
${JSON.stringify(summary, null, 2)}

Return only JSON:
{
  "healthScore": 0,
  "healthLabel": "Excellent | Good | Fair | Needs Attention",
  "insights": [
    { "type": "positive | warning | tip", "title": "short title", "message": "max 2 short sentences" }
  ],
  "suggestedActions": [
    { "title": "short action", "description": "one practical sentence", "priority": "high | medium | low" }
  ]
}
Use exactly 4 insights and 3 to 5 actions.`;
}

function chatPrompt(
  summary: FinanceSummary,
  context: CurrencyContext,
  question: string,
) {
  return `You are the private finance assistant inside Jamal's Finance native app.
Answer only from the summarized finance data. Do not invent raw transactions, account names, people, references, dates, or categories that are not present.
Stored values are PKR. Display currency is ${context.currency}. One PKR equals ${context.pkrToDisplayRate} ${context.currency}. ${
    context.rateLive
      ? "The conversion rate is live."
      : "The conversion rate may be approximate."
  }
When the summary cannot answer, clearly say which data is missing.

Summary:
${JSON.stringify(summary, null, 2)}

Question:
${question}

Return only JSON:
{
  "answer": "2 to 5 short sentences",
  "followUps": ["optional short question", "optional short question"]
}`;
}

function localChat(
  summary: FinanceSummary,
  context: CurrencyContext,
  question: string,
) {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const topCategory = summary.categorySpendingTotals[0];
  let answer: string;

  if (
    /\b(spend|spent|expense|expenses)\b/.test(normalized) &&
    /\b(most|highest|top|biggest|where)\b/.test(normalized)
  ) {
    answer = topCategory
      ? `${topCategory.category} is the highest category at ${formatDisplayMoney(
          topCategory.amount,
          context,
        )} this month.`
      : "No categorized spending is available this month.";
  } else if (/\b(spend|spent|expense|expenses)\b/.test(normalized)) {
    answer = `Current month expenses are ${formatDisplayMoney(
      summary.currentMonth.expenses,
      context,
    )}. Refunds are already subtracted.`;
  } else if (/\b(income|earn|earned|salary)\b/.test(normalized)) {
    answer = `Current month income is ${formatDisplayMoney(
      summary.currentMonth.income,
      context,
    )}.`;
  } else if (/\b(net|saving|savings|cash flow|cashflow)\b/.test(normalized)) {
    answer = `Current month net is ${formatDisplayMoney(
      summary.currentMonth.net,
      context,
    )}, with a ${summary.currentMonth.savingsRate}% savings rate.`;
  } else if (/\b(payable|payables|debt|due|overdue)\b/.test(normalized)) {
    answer = `${formatDisplayMoney(
      summary.payablesSummary.remaining,
      context,
    )} remains payable, with ${
      summary.payablesSummary.overdueCount
    } overdue record${
      summary.payablesSummary.overdueCount === 1 ? "" : "s"
    }.`;
  } else if (/\b(goal|goals|target)\b/.test(normalized)) {
    answer = `Goals are ${
      summary.goalsSummary.completionPct
    }% funded: ${formatDisplayMoney(
      summary.goalsSummary.totalSaved,
      context,
    )} saved toward ${formatDisplayMoney(
      summary.goalsSummary.totalTarget,
      context,
    )}.`;
  } else if (/\b(invest|investment|asset|portfolio)\b/.test(normalized)) {
    answer = `The portfolio current value is ${formatDisplayMoney(
      summary.investmentSummary.currentValue,
      context,
    )}. Total P/L is ${formatDisplayMoney(
      summary.investmentSummary.totalPnL,
      context,
    )} (${summary.investmentSummary.totalPnLPct}%).`;
  } else {
    answer =
      "Ask about income, expenses, the biggest spending category, net savings, payables, goals, investments, or portfolio performance.";
  }

  return {
    provider: "local-calculator",
    model: "native-finance-ledger-v1",
    aiAvailable: true,
    deterministic: true,
    answer,
    followUps: [
      "Where did I spend the most?",
      "How can I improve my cash flow?",
      "What should I focus on next?",
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticatedClient(request);
    if (!auth.ok) return auth.response;

    const context = parseCurrencyContext(request);
    const { summary, hasFinanceData } = await buildFinanceSummary(
      auth.supabase,
    );
    const fallback = fallbackInsights(summary, context);
    const cards = summaryCards(summary, context);
    const { apiKey, model } = geminiConfig();

    if (!hasFinanceData) {
      return json({
        empty: true,
        message: "Add finance records to get personalized insights.",
        provider: "gemini",
        model,
        aiAvailable: Boolean(apiKey),
        generatedAt: new Date().toISOString(),
        healthScore: 0,
        healthLabel: "Getting Started",
        insights: [],
        suggestedActions: [],
        summaryCards: cards,
      });
    }

    if (!apiKey) {
      return json({
        ...fallback,
        provider: "local-finance-intelligence",
        model: "native-finance-summary-v1",
        generatedAt: new Date().toISOString(),
        summaryCards: cards,
        aiAvailable: false,
        message: UNAVAILABLE_MESSAGE,
      });
    }

    try {
      const generated = parseGeneratedInsights(
        await callGemini(
          apiKey,
          model,
          insightPrompt(summary, context),
        ),
      );
      if (!generated) throw new Error("Invalid AI response shape.");
      return json({
        ...generated,
        provider: "gemini",
        model,
        generatedAt: new Date().toISOString(),
        summaryCards: cards,
        aiAvailable: true,
      });
    } catch (error) {
      console.error("[native-ai] Gemini insight request failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return json({
        ...fallback,
        provider: "local-finance-intelligence",
        model: "native-finance-summary-v1",
        generatedAt: new Date().toISOString(),
        summaryCards: cards,
        aiAvailable: false,
        message: UNAVAILABLE_MESSAGE,
      });
    }
  } catch (error) {
    console.error("[native-ai] route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json(
      {
        error: "native_ai_unavailable",
        message: UNAVAILABLE_MESSAGE,
      },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticatedClient(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => null)) as unknown;
    const question =
      isRecord(body) && typeof body.question === "string"
        ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
        : "";
    if (!question) {
      return json(
        {
          error: "question_required",
          message: "Ask a finance question before sending.",
        },
        400,
      );
    }

    const context = parseCurrencyContext(request, body);
    const { summary } = await buildFinanceSummary(auth.supabase);
    const { apiKey, model } = geminiConfig();

    if (!apiKey) {
      return json(localChat(summary, context, question));
    }

    try {
      const parsed = parseChat(
        await callGemini(
          apiKey,
          model,
          chatPrompt(summary, context, question),
        ),
      );
      if (!parsed) throw new Error("Invalid chat response shape.");
      return json({
        provider: "gemini",
        model,
        aiAvailable: true,
        deterministic: false,
        ...parsed,
      });
    } catch (error) {
      console.error("[native-ai] Gemini chat request failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
      return json(localChat(summary, context, question));
    }
  } catch (error) {
    console.error("[native-ai] chat route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json(
      {
        error: "native_ai_unavailable",
        message: UNAVAILABLE_MESSAGE,
      },
      503,
    );
  }
}
