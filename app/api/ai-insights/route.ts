import { getAppMonthRange, getDaysInMonth, formatDateKey } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const AI_UNAVAILABLE_MESSAGE =
  "AI insights are temporarily unavailable. Try again later.";
const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type InsightType = "positive" | "warning" | "tip";
type SummaryTone = "positive" | "warning" | "danger" | "info" | "neutral";
type ActionPriority = "high" | "medium" | "low";

type GeneratedInsight = {
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
  insights: GeneratedInsight[];
  suggestedActions: SuggestedAction[];
};

type AIInsightsResponse = GeneratedInsights & {
  provider: "gemini";
  model: string;
  generatedAt: string;
  summaryCards: SummaryCard[];
  financeSummary: FinanceSummary;
  aiAvailable: boolean;
  message?: string;
};

type ChatResponse = {
  provider: "gemini";
  model: string;
  answer: string;
  followUps: string[];
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

type FinanceSummary = {
  currency: "PKR";
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

type GeminiGenerateContentResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function errorResponse(
  error: string,
  status: number,
  message = AI_UNAVAILABLE_MESSAGE,
) {
  return NextResponse.json({ error, message }, { status });
}

function logSafeError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.error(context, {
      name: error.name,
      message: error.message,
    });
    return;
  }

  console.error(context, { name: "UnknownError" });
}

function getSupabaseErrorSummary(error: unknown) {
  if (!isRecord(error)) return { name: "UnknownError" };

  return {
    code: typeof error.code === "string" ? error.code : undefined,
    message: typeof error.message === "string" ? error.message : undefined,
    details: typeof error.details === "string" ? error.details : undefined,
    hint: typeof error.hint === "string" ? error.hint : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value);
}

function roundPct(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function formatPKRValue(value: number) {
  const absolute = Math.abs(roundCurrency(value)).toLocaleString("en-PK");
  return `${value < 0 ? "-" : ""}PKR ${absolute}`;
}

function getCategoryName(
  category: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;
  return selected?.name?.trim() || "Other";
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMonthRanges(year: number, month: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = year * 12 + (month - 1) - (count - 1 - index);
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

function sanitizeModelName(value: string) {
  return value.trim().replace(/^models\//, "") || GEMINI_MODEL_FALLBACK;
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = sanitizeModelName(
    process.env.GEMINI_MODEL ?? GEMINI_MODEL_FALLBACK,
  );

  return { apiKey, model };
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

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;

  const cleaned = value.replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, maxLength);
}

function parseGeneratedInsights(text: string): GeneratedInsights | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  const score = parsed.healthScore;
  const label = parsed.healthLabel;
  const insights = parsed.insights;
  const suggestedActions = parsed.suggestedActions;

  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    typeof label !== "string" ||
    !Array.isArray(insights) ||
    !Array.isArray(suggestedActions)
  ) {
    return null;
  }

  const safeInsights = insights
    .map((insight): GeneratedInsight | null => {
      if (!isRecord(insight)) return null;

      return {
        type: parseInsightType(insight.type),
        title: cleanText(insight.title, "Finance insight", 90),
        message: cleanText(insight.message, "Review your latest summary.", 280),
      };
    })
    .filter((insight): insight is GeneratedInsight => Boolean(insight))
    .slice(0, 4);

  const safeActions = suggestedActions
    .map((action): SuggestedAction | null => {
      if (!isRecord(action)) return null;

      return {
        title: cleanText(action.title, "Review finances", 90),
        description: cleanText(
          action.description,
          "Check the current month summary and decide the next step.",
          260,
        ),
        priority: parsePriority(action.priority),
      };
    })
    .filter((action): action is SuggestedAction => Boolean(action))
    .slice(0, 5);

  if (safeInsights.length === 0 || safeActions.length === 0) return null;

  return {
    healthScore: Math.max(0, Math.min(100, Math.round(score))),
    healthLabel: cleanText(label, "Fair", 40),
    insights: safeInsights,
    suggestedActions: safeActions,
  };
}

function parseChatResponse(text: string): Pick<ChatResponse, "answer" | "followUps"> | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps
        .map((followUp) => cleanText(followUp, "", 90))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return {
    answer: cleanText(
      parsed.answer,
      "I could not prepare a finance answer right now.",
      900,
    ),
    followUps,
  };
}

function extractGeminiText(response: GeminiGenerateContentResponse) {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

async function callGemini({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const json = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok || json.error) {
    const status = json.error?.status ?? response.statusText;
    const code = json.error?.code ?? response.status;
    throw new Error(`Gemini request failed: ${code} ${status}`);
  }

  const text = extractGeminiText(json);
  if (!text) throw new Error("Gemini returned an empty response");

  return text;
}

async function readSummaryRows<T>(
  label: string,
  request: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const { data, error } = await request;

  if (error) {
    console.error(
      `AI insights ${label} query failed`,
      getSupabaseErrorSummary(error),
    );
    return [];
  }

  return data ?? [];
}

async function readTransactionRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  oldestTrendStart: string,
  lastDay: string,
) {
  const joined = await supabase
    .from("transactions")
    .select("amount, date, type, categories(name)")
    .gte("date", oldestTrendStart)
    .lte("date", lastDay);

  if (!joined.error) {
    return ((joined.data ?? []) as RawTransaction[]);
  }

  console.error(
    "AI insights transactions query failed",
    getSupabaseErrorSummary(joined.error),
  );

  return readSummaryRows<RawTransaction>(
    "transactions fallback",
    supabase
      .from("transactions")
      .select("amount, date, type")
      .gte("date", oldestTrendStart)
      .lte("date", lastDay),
  );
}

async function getFinanceSummary() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: errorResponse(
        "authentication_required",
        401,
        "Please log in before using AI insights.",
      ),
    };
  }

  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const recentRanges = getMonthRanges(year, month, 3);
  const oldestTrendStart = recentRanges[0]?.firstDay ?? firstDay;

  const [
    rawTransactions,
    rawGoals,
    rawInvestments,
    rawPayables,
    rawAccounts,
  ] = await Promise.all([
    readTransactionRows(supabase, oldestTrendStart, lastDay),
    readSummaryRows<RawGoal>(
      "goals",
      supabase.from("goals").select("current_amount, target_amount, status"),
    ),
    readSummaryRows<RawInvestment>(
      "investments",
      supabase
        .from("investments")
        .select("type, quantity, purchase_price, current_price"),
    ),
    readSummaryRows<RawPayable>(
      "payables",
      supabase
        .from("liabilities")
        .select("original_value, paid_amount, remaining_amount, due_date, status"),
    ),
    readSummaryRows<RawAccount>(
      "accounts",
      supabase.from("accounts").select("balance"),
    ),
  ]);

  const transactions = rawTransactions as RawTransaction[];
  const goals = rawGoals as RawGoal[];
  const investments = rawInvestments as RawInvestment[];
  const payables = rawPayables as RawPayable[];
  const accounts = rawAccounts as RawAccount[];

  const currentMonthTransactions = transactions.filter(
    (transaction) =>
      transaction.date &&
      transaction.date >= firstDay &&
      transaction.date <= lastDay,
  );
  const currentIncome = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount), 0);
  const currentExpenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount), 0);
  const categoryMap = new Map<string, number>();

  currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const category = getCategoryName(transaction.categories);
      categoryMap.set(
        category,
        (categoryMap.get(category) ?? 0) + toFiniteNumber(transaction.amount),
      );
    });

  const categorySpendingTotals = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount: roundCurrency(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const recentTrendTotals = recentRanges.map((range) => {
    const rangeTransactions = transactions.filter(
      (transaction) =>
        transaction.date &&
        transaction.date >= range.firstDay &&
        transaction.date <= range.lastDay,
    );
    const income = rangeTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount), 0);
    const expenses = rangeTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount), 0);

    return {
      month: range.key,
      income: roundCurrency(income),
      expenses: roundCurrency(expenses),
      net: roundCurrency(income - expenses),
    };
  });

  const totalTarget = goals.reduce(
    (sum, goal) => sum + toFiniteNumber(goal.target_amount),
    0,
  );
  const totalSaved = goals.reduce(
    (sum, goal) => sum + toFiniteNumber(goal.current_amount),
    0,
  );
  const completedCount = goals.filter(
    (goal) =>
      goal.status === "completed" ||
      (toFiniteNumber(goal.target_amount) > 0 &&
        toFiniteNumber(goal.current_amount) >= toFiniteNumber(goal.target_amount)),
  ).length;

  const investmentTypeMap = new Map<
    string,
    { type: string; currentValue: number; totalInvested: number }
  >();
  let totalInvested = 0;
  let investmentValue = 0;

  investments.forEach((investment) => {
    const quantity = toFiniteNumber(investment.quantity);
    const invested = quantity * toFiniteNumber(investment.purchase_price);
    const value = quantity * toFiniteNumber(investment.current_price);
    const type = titleCase(investment.type || "Other") || "Other";
    const existing =
      investmentTypeMap.get(type) ??
      {
        type,
        currentValue: 0,
        totalInvested: 0,
      };

    existing.currentValue += value;
    existing.totalInvested += invested;
    investmentTypeMap.set(type, existing);
    totalInvested += invested;
    investmentValue += value;
  });

  const payablesWithStatus = payables.map((payable) => ({
    ...payable,
    status: getPayableStatus({
      status: payable.status ?? "pending",
      remaining_amount: toFiniteNumber(payable.remaining_amount),
      due_date: payable.due_date ?? null,
    }),
  }));
  const payableOriginal = payablesWithStatus.reduce(
    (sum, payable) => sum + toFiniteNumber(payable.original_value),
    0,
  );
  const payablePaid = payablesWithStatus.reduce(
    (sum, payable) => sum + toFiniteNumber(payable.paid_amount),
    0,
  );
  const payableRemaining = payablesWithStatus.reduce(
    (sum, payable) => sum + toFiniteNumber(payable.remaining_amount),
    0,
  );
  const cashBalance = accounts.reduce(
    (sum, account) => sum + toFiniteNumber(account.balance),
    0,
  );

  const summary: FinanceSummary = {
    currency: "PKR",
    period: {
      currentMonth: `${year}-${String(month).padStart(2, "0")}`,
      currentMonthStart: firstDay,
      currentMonthEnd: lastDay,
    },
    currentMonth: {
      income: roundCurrency(currentIncome),
      expenses: roundCurrency(currentExpenses),
      net: roundCurrency(currentIncome - currentExpenses),
      savingsRate:
        currentIncome > 0
          ? roundPct(((currentIncome - currentExpenses) / currentIncome) * 100)
          : 0,
    },
    netBalance: {
      cashBalance: roundCurrency(cashBalance),
      investmentValue: roundCurrency(investmentValue),
      payableRemaining: roundCurrency(payableRemaining),
      estimatedNetWorth: roundCurrency(
        cashBalance + investmentValue - payableRemaining,
      ),
    },
    categorySpendingTotals,
    goalsSummary: {
      count: goals.length,
      completedCount,
      totalTarget: roundCurrency(totalTarget),
      totalSaved: roundCurrency(totalSaved),
      completionPct: totalTarget > 0 ? roundPct((totalSaved / totalTarget) * 100) : 0,
    },
    investmentSummary: {
      count: investments.length,
      totalInvested: roundCurrency(totalInvested),
      currentValue: roundCurrency(investmentValue),
      totalPnL: roundCurrency(investmentValue - totalInvested),
      totalPnLPct:
        totalInvested > 0
          ? roundPct(((investmentValue - totalInvested) / totalInvested) * 100)
          : 0,
      byType: Array.from(investmentTypeMap.values())
        .map((item) => ({
          type: item.type,
          currentValue: roundCurrency(item.currentValue),
          totalInvested: roundCurrency(item.totalInvested),
        }))
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 6),
    },
    payablesSummary: {
      count: payables.length,
      totalOriginal: roundCurrency(payableOriginal),
      paid: roundCurrency(payablePaid),
      remaining: roundCurrency(payableRemaining),
      overdueCount: payablesWithStatus.filter((payable) => payable.status === "overdue")
        .length,
    },
    recentTrendTotals,
  };

  const hasFinanceData =
    transactions.length > 0 ||
    goals.length > 0 ||
    investments.length > 0 ||
    payables.length > 0 ||
    accounts.some((account) => toFiniteNumber(account.balance) !== 0);

  return { ok: true as const, summary, hasFinanceData };
}

function buildSummaryCards(summary: FinanceSummary): SummaryCard[] {
  const trend = summary.recentTrendTotals;
  const previous = trend.length >= 2 ? trend[trend.length - 2] : null;
  const expenseDelta = previous
    ? summary.currentMonth.expenses - previous.expenses
    : 0;

  return [
    {
      label: "Month income",
      value: formatPKRValue(summary.currentMonth.income),
      caption: `${summary.currentMonth.savingsRate}% savings rate`,
      tone: summary.currentMonth.income > 0 ? "positive" : "neutral",
    },
    {
      label: "Month expenses",
      value: formatPKRValue(summary.currentMonth.expenses),
      caption:
        previous && expenseDelta !== 0
          ? `${formatPKRValue(Math.abs(expenseDelta))} ${expenseDelta > 0 ? "above" : "below"} last month`
          : "Current month spending",
      tone: expenseDelta > 0 ? "warning" : "info",
    },
    {
      label: "Net balance",
      value: formatPKRValue(summary.netBalance.estimatedNetWorth),
      caption: `${formatPKRValue(summary.netBalance.cashBalance)} cash balance`,
      tone: summary.netBalance.estimatedNetWorth >= 0 ? "positive" : "danger",
    },
    {
      label: "Payables due",
      value: formatPKRValue(summary.payablesSummary.remaining),
      caption: `${summary.payablesSummary.overdueCount} overdue record${summary.payablesSummary.overdueCount === 1 ? "" : "s"}`,
      tone: summary.payablesSummary.overdueCount > 0 ? "danger" : "neutral",
    },
  ];
}

function buildFallbackInsights(summary: FinanceSummary): GeneratedInsights {
  const scoreFromSavings = Math.max(
    0,
    Math.min(45, 25 + summary.currentMonth.savingsRate),
  );
  const scoreFromGoals = Math.min(25, summary.goalsSummary.completionPct / 4);
  const scoreFromPayables =
    summary.payablesSummary.remaining > 0
      ? Math.max(0, 20 - summary.payablesSummary.overdueCount * 8)
      : 20;
  const scoreFromInvestments =
    summary.investmentSummary.currentValue > 0 ? 10 : 4;
  const healthScore = Math.round(
    Math.max(25, Math.min(95, scoreFromSavings + scoreFromGoals + scoreFromPayables + scoreFromInvestments)),
  );
  const topCategory = summary.categorySpendingTotals[0];
  const insights: GeneratedInsight[] = [
    {
      type: summary.currentMonth.net >= 0 ? "positive" : "warning",
      title: summary.currentMonth.net >= 0 ? "Positive monthly net" : "Monthly net needs attention",
      message:
        summary.currentMonth.net >= 0
          ? `This month is ahead by ${formatPKRValue(summary.currentMonth.net)} after expenses.`
          : `This month is short by ${formatPKRValue(Math.abs(summary.currentMonth.net))}; review flexible spending first.`,
    },
    {
      type: topCategory ? "tip" : "warning",
      title: topCategory ? `${topCategory.category} is the top category` : "No category spending yet",
      message: topCategory
        ? `${topCategory.category} has reached ${formatPKRValue(topCategory.amount)} this month.`
        : "Add categorized expenses to get better spending guidance.",
    },
    {
      type: summary.goalsSummary.count > 0 ? "positive" : "tip",
      title: "Goal progress",
      message:
        summary.goalsSummary.count > 0
          ? `Goals are ${summary.goalsSummary.completionPct}% funded across ${summary.goalsSummary.count} active target${summary.goalsSummary.count === 1 ? "" : "s"}.`
          : "Create one savings goal to make monthly surplus easier to direct.",
    },
    {
      type: summary.payablesSummary.overdueCount > 0 ? "warning" : "tip",
      title: "Payables check",
      message:
        summary.payablesSummary.remaining > 0
          ? `${formatPKRValue(summary.payablesSummary.remaining)} remains payable, with ${summary.payablesSummary.overdueCount} overdue record${summary.payablesSummary.overdueCount === 1 ? "" : "s"}.`
          : "No outstanding payable balance is currently visible in the summary.",
    },
  ];

  const suggestedActions: SuggestedAction[] = [
    {
      title: summary.currentMonth.net >= 0 ? "Allocate monthly surplus" : "Reduce the biggest category",
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
      priority: summary.payablesSummary.overdueCount > 0 ? "high" : "low",
    },
    {
      title: "Keep trend tracking current",
      description: "Refresh categories and account balances so Gemini can compare month-to-month movement.",
      priority: "medium",
    },
  ];

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
    insights,
    suggestedActions,
  };
}

function buildInsightPrompt(summary: FinanceSummary) {
  return `You are a personal finance assistant for Jamal's Finance.
Use only this summarized finance data. Do not ask for raw transaction rows.
Currency is PKR. Be concise, practical, and privacy-aware.

Summarized finance data:
${JSON.stringify(summary, null, 2)}

Return only valid JSON with this exact shape:
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
Use exactly 4 insights and 3 to 5 suggestedActions.`;
}

function buildChatPrompt(summary: FinanceSummary, question: string) {
  return `You are the Gemini finance chat assistant inside Jamal's Finance.
Answer the user's question using only the summarized finance data below.
Do not mention raw transaction access. Do not invent account names, transaction descriptions, or people.
Currency is PKR. If the answer needs data not in the summary, say what is missing.

Summarized finance data:
${JSON.stringify(summary, null, 2)}

User question:
${question}

Return only valid JSON:
{
  "answer": "helpful answer in 2 to 5 short sentences",
  "followUps": ["optional short follow-up question", "optional short follow-up question"]
}`;
}

export async function GET() {
  try {
    const summaryResult = await getFinanceSummary();

    if (!summaryResult.ok) return summaryResult.response;

    const { summary, hasFinanceData } = summaryResult;
    const { apiKey, model } = getGeminiConfig();
    const summaryCards = buildSummaryCards(summary);
    const fallback = buildFallbackInsights(summary);

    if (!hasFinanceData) {
      return NextResponse.json({
        empty: true,
        message: "Add finance records to get personalized Gemini insights.",
        provider: "gemini",
        model,
        aiAvailable: Boolean(apiKey),
        generatedAt: new Date().toISOString(),
        summaryCards,
        financeSummary: summary,
        insights: [],
        suggestedActions: [],
      });
    }

    if (!apiKey) {
      console.error("AI insights unavailable: missing GEMINI_API_KEY");
      return NextResponse.json({
        ...fallback,
        provider: "gemini",
        model,
        generatedAt: new Date().toISOString(),
        summaryCards,
        financeSummary: summary,
        aiAvailable: false,
        message: AI_UNAVAILABLE_MESSAGE,
      } satisfies AIInsightsResponse);
    }

    try {
      const text = await callGemini({
        apiKey,
        model,
        prompt: buildInsightPrompt(summary),
      });
      const generated = parseGeneratedInsights(text);

      if (!generated) {
        console.error("AI insights provider returned invalid JSON shape");
        return NextResponse.json({
          ...fallback,
          provider: "gemini",
          model,
          generatedAt: new Date().toISOString(),
          summaryCards,
          financeSummary: summary,
          aiAvailable: false,
          message: AI_UNAVAILABLE_MESSAGE,
        } satisfies AIInsightsResponse);
      }

      return NextResponse.json({
        ...generated,
        provider: "gemini",
        model,
        generatedAt: new Date().toISOString(),
        summaryCards,
        financeSummary: summary,
        aiAvailable: true,
      } satisfies AIInsightsResponse);
    } catch (error) {
      logSafeError("AI insights Gemini request failed", error);

      return NextResponse.json({
        ...fallback,
        provider: "gemini",
        model,
        generatedAt: new Date().toISOString(),
        summaryCards,
        financeSummary: summary,
        aiAvailable: false,
        message: AI_UNAVAILABLE_MESSAGE,
      } satisfies AIInsightsResponse);
    }
  } catch (error) {
    logSafeError("AI insights route failed", error);
    return errorResponse("ai_provider_unavailable", 503);
  }
}

export async function POST(request: NextRequest) {
  try {
    const summaryResult = await getFinanceSummary();

    if (!summaryResult.ok) return summaryResult.response;

    const body = (await request.json().catch(() => null)) as unknown;
    const question =
      isRecord(body) && typeof body.question === "string"
        ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
        : "";

    if (!question) {
      return errorResponse(
        "question_required",
        400,
        "Ask a finance question before sending.",
      );
    }

    const { apiKey, model } = getGeminiConfig();

    if (!apiKey) {
      console.error("AI chat unavailable: missing GEMINI_API_KEY");
      return errorResponse("missing_ai_configuration", 503);
    }

    const text = await callGemini({
      apiKey,
      model,
      prompt: buildChatPrompt(summaryResult.summary, question),
    });
    const chat = parseChatResponse(text);

    if (!chat) {
      console.error("AI chat provider returned invalid JSON shape");
      return errorResponse("invalid_ai_response", 502);
    }

    return NextResponse.json({
      provider: "gemini",
      model,
      ...chat,
    } satisfies ChatResponse);
  } catch (error) {
    logSafeError("AI chat Gemini request failed", error);
    return errorResponse("ai_provider_unavailable", 503);
  }
}
