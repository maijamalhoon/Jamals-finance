import { getAppMonthRange } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash";

interface RawCategory {
  name?: string | null;
}

interface RawTransaction {
  amount?: number | string | null;
  type?: string | null;
  categories?: RawCategory | RawCategory[] | null;
}

interface RawGoal {
  current_amount?: number | string | null;
  target_amount?: number | string | null;
  status?: string | null;
}

interface RawInvestment {
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
}

interface RawPayable {
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
}

interface RawAccount {
  balance?: number | string | null;
}

interface ChatSummary {
  period: string;
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
    completionPct: number;
  };
  investmentSummary: {
    count: number;
    currentValue: number;
    totalPnL: number;
  };
  payablesSummary: {
    count: number;
    remaining: number;
    overdueCount: number;
  };
}

interface CurrencyContext {
  currency: SupportedCurrency;
  rate: number;
  live: boolean;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    code?: number;
    status?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value);
}

function roundPct(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function getCategoryName(
  category: RawCategory | RawCategory[] | null | undefined,
) {
  const selected = Array.isArray(category) ? category[0] : category;
  return selected?.name?.trim() || "Other";
}

function getCurrencyContext(body: unknown): CurrencyContext {
  if (!isRecord(body)) {
    return {
      currency: BASE_CURRENCY,
      rate: normalizeUsdToPkrRate(undefined),
      live: false,
    };
  }

  const currency =
    typeof body.currency === "string" && isSupportedCurrency(body.currency)
      ? body.currency
      : BASE_CURRENCY;
  const rate = normalizeUsdToPkrRate(
    typeof body.rate === "number" || typeof body.rate === "string"
      ? Number(body.rate)
      : undefined,
  );

  return {
    currency,
    rate,
    live: body.rateLive === true,
  };
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function getChatSummary() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: jsonResponse(
        {
          error: "authentication_required",
          message: "Please log in before using AI insights.",
        },
        401,
      ),
    };
  }

  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const [transactionsResult, goalsResult, investmentsResult, payablesResult, accountsResult] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount, type, categories(name)")
        .gte("date", firstDay)
        .lte("date", lastDay)
        .is("deleted_at", null),
      supabase
        .from("goals")
        .select("current_amount, target_amount, status"),
      supabase
        .from("investments")
        .select("quantity, purchase_price, current_price"),
      supabase
        .from("liabilities")
        .select("remaining_amount, due_date, status"),
      supabase
        .from("accounts")
        .select("balance")
        .eq("status", "active"),
    ]);

  const failedQueries = [
    transactionsResult.error,
    goalsResult.error,
    investmentsResult.error,
    payablesResult.error,
    accountsResult.error,
  ].filter(Boolean);

  if (failedQueries.length > 0) {
    console.error("AI chat fallback summary query failed", {
      count: failedQueries.length,
    });
  }

  const transactions = (transactionsResult.data ?? []) as RawTransaction[];
  const goals = (goalsResult.data ?? []) as RawGoal[];
  const investments = (investmentsResult.data ?? []) as RawInvestment[];
  const payables = (payablesResult.data ?? []) as RawPayable[];
  const accounts = (accountsResult.data ?? []) as RawAccount[];

  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const grossExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const refunds = transactions
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const expenses = grossExpenses - refunds;
  const net = income - expenses;

  const categoryMap = new Map<string, number>();
  transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" || transaction.type === "refund",
    )
    .forEach((transaction) => {
      const category = getCategoryName(transaction.categories);
      const direction = transaction.type === "refund" ? -1 : 1;
      categoryMap.set(
        category,
        (categoryMap.get(category) ?? 0) +
          direction * toNumber(transaction.amount),
      );
    });

  const categorySpendingTotals = Array.from(categoryMap.entries())
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const totalGoalTarget = goals.reduce(
    (sum, goal) => sum + toNumber(goal.target_amount),
    0,
  );
  const totalGoalSaved = goals.reduce(
    (sum, goal) => sum + toNumber(goal.current_amount),
    0,
  );
  const completedGoals = goals.filter(
    (goal) =>
      goal.status === "completed" ||
      (toNumber(goal.target_amount) > 0 &&
        toNumber(goal.current_amount) >= toNumber(goal.target_amount)),
  ).length;

  let totalInvested = 0;
  let investmentValue = 0;
  investments.forEach((investment) => {
    const quantity = toNumber(investment.quantity);
    totalInvested += quantity * toNumber(investment.purchase_price);
    investmentValue += quantity * toNumber(investment.current_price);
  });

  const normalizedPayables = payables.map((payable) => ({
    ...payable,
    status: getPayableStatus({
      status: payable.status ?? "pending",
      remaining_amount: toNumber(payable.remaining_amount),
      due_date: payable.due_date ?? null,
    }),
  }));
  const payableRemaining = normalizedPayables.reduce(
    (sum, payable) => sum + toNumber(payable.remaining_amount),
    0,
  );
  const cashBalance = accounts.reduce(
    (sum, account) => sum + toNumber(account.balance),
    0,
  );

  const summary: ChatSummary = {
    period: `${year}-${String(month).padStart(2, "0")}`,
    currentMonth: {
      income: round(income),
      expenses: round(expenses),
      net: round(net),
      savingsRate: income > 0 ? roundPct((net / income) * 100) : 0,
    },
    netBalance: {
      cashBalance: round(cashBalance),
      investmentValue: round(investmentValue),
      payableRemaining: round(payableRemaining),
      estimatedNetWorth: round(cashBalance + investmentValue - payableRemaining),
    },
    categorySpendingTotals,
    goalsSummary: {
      count: goals.length,
      completedCount: completedGoals,
      completionPct:
        totalGoalTarget > 0
          ? roundPct((totalGoalSaved / totalGoalTarget) * 100)
          : 0,
    },
    investmentSummary: {
      count: investments.length,
      currentValue: round(investmentValue),
      totalPnL: round(investmentValue - totalInvested),
    },
    payablesSummary: {
      count: payables.length,
      remaining: round(payableRemaining),
      overdueCount: normalizedPayables.filter(
        (payable) => payable.status === "overdue",
      ).length,
    },
  };

  return { ok: true as const, summary };
}

function buildPrompt(
  summary: ChatSummary,
  question: string,
  context: CurrencyContext,
) {
  return `You are the finance chat assistant inside Jamal's Finance.
Answer only from the summarized finance data below. Never invent records, names, or transactions.
Use ${context.currency} for all user-facing money values. Stored values are PKR and 1 USD = ${context.rate.toFixed(2)} PKR. ${context.live ? "The exchange rate is live." : "The exchange rate is approximate."}
Keep the answer practical and concise.

Finance summary:
${JSON.stringify(summary, null, 2)}

User question:
${question}

Return only valid JSON in this exact shape:
{
  "answer": "helpful answer in 2 to 5 short sentences",
  "followUps": ["short follow-up question", "short follow-up question"]
}`;
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }
}

function parseGeminiChat(text: string) {
  const parsed = parseJsonObject(text);
  if (!isRecord(parsed) || typeof parsed.answer !== "string") return null;

  const answer = parsed.answer.replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!answer) return null;

  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return { answer, followUps };
}

async function askGemini(
  summary: ChatSummary,
  question: string,
  context: CurrencyContext,
) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model =
    process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
    GEMINI_MODEL_FALLBACK;

  if (!apiKey) return null;

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(summary, question, context) }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(18_000),
    },
  );

  const json = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok || !json || json.error) {
    console.warn("AI chat provider unavailable; using finance fallback", {
      status: json?.error?.status ?? response.statusText,
      code: json?.error?.code ?? response.status,
    });
    return null;
  }

  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  return text ? parseGeminiChat(text) : null;
}

function buildLocalAnswer(
  summary: ChatSummary,
  question: string,
  context: CurrencyContext,
) {
  const normalizedQuestion = question.toLowerCase();
  const money = (value: number) =>
    formatMoney(value, {
      currency: context.currency,
      usdToPkrRate: context.rate,
    });
  const topCategory = summary.categorySpendingTotals[0];

  if (/spend|spent|expense|category|kharch/.test(normalizedQuestion)) {
    const answer = topCategory
      ? `${topCategory.category} is your highest spending category this month at ${money(topCategory.amount)}. Your total monthly expenses are ${money(summary.currentMonth.expenses)}, so reviewing this category first will have the biggest impact.`
      : `No categorized spending is available for this month yet. Add or categorize expenses and I will be able to identify where most of your money is going.`;

    return {
      answer,
      followUps: [
        "How can I reduce my biggest expense?",
        "What is my monthly cash flow?",
      ],
    };
  }

  if (/cash flow|cashflow|income|saving|save|budget/.test(normalizedQuestion)) {
    const direction = summary.currentMonth.net >= 0 ? "surplus" : "shortfall";
    const answer = `This month you recorded ${money(summary.currentMonth.income)} in income and ${money(summary.currentMonth.expenses)} in expenses, leaving a ${direction} of ${money(Math.abs(summary.currentMonth.net))}. Your current savings rate is ${summary.currentMonth.savingsRate}%; ${summary.currentMonth.net >= 0 ? "direct part of the surplus toward goals or investments" : "reduce flexible spending before taking on new commitments"}.`;

    return {
      answer,
      followUps: [
        "Where did I spend the most?",
        "What should I focus on next?",
      ],
    };
  }

  if (/goal|target/.test(normalizedQuestion)) {
    const answer = summary.goalsSummary.count > 0
      ? `You have ${summary.goalsSummary.count} goal${summary.goalsSummary.count === 1 ? "" : "s"}, with ${summary.goalsSummary.completedCount} completed and overall funding at ${summary.goalsSummary.completionPct}%. Use any monthly surplus to consistently fund the highest-priority unfinished goal.`
      : "You do not have a savings goal recorded yet. Creating one clear target will make it easier to direct monthly surplus and track progress.";

    return {
      answer,
      followUps: ["How much can I save this month?", "What should I focus on next?"],
    };
  }

  if (/invest|portfolio|profit|loss|pnl/.test(normalizedQuestion)) {
    const pnlDirection = summary.investmentSummary.totalPnL >= 0 ? "gain" : "loss";
    const answer = summary.investmentSummary.count > 0
      ? `Your ${summary.investmentSummary.count} investment record${summary.investmentSummary.count === 1 ? "" : "s"} are currently worth ${money(summary.investmentSummary.currentValue)}, with an estimated ${pnlDirection} of ${money(Math.abs(summary.investmentSummary.totalPnL))}. Review concentration and avoid adding more risk if cash flow or payables need attention first.`
      : "No investments are currently recorded. Build a stable monthly surplus and emergency buffer before adding new investment risk.";

    return {
      answer,
      followUps: ["What is my net balance?", "How can I improve my cash flow?"],
    };
  }

  if (/payable|debt|loan|due|liabil/.test(normalizedQuestion)) {
    const answer = summary.payablesSummary.remaining > 0
      ? `You have ${money(summary.payablesSummary.remaining)} remaining across ${summary.payablesSummary.count} payable record${summary.payablesSummary.count === 1 ? "" : "s"}, including ${summary.payablesSummary.overdueCount} overdue. Clear overdue items first, then prioritize the largest or most expensive obligation.`
      : "No outstanding payable balance is visible in your current summary. Keep repayments updated so your net balance remains accurate.";

    return {
      answer,
      followUps: ["What should I pay first?", "What is my net balance?"],
    };
  }

  if (/balance|worth|financial health|health/.test(normalizedQuestion)) {
    return {
      answer: `Your estimated net balance is ${money(summary.netBalance.estimatedNetWorth)}, based on ${money(summary.netBalance.cashBalance)} in cash, ${money(summary.netBalance.investmentValue)} in investments, and ${money(summary.netBalance.payableRemaining)} remaining in payables. The strongest next step is to protect positive monthly cash flow and address any overdue commitments.`,
      followUps: ["How can I improve my cash flow?", "What should I focus on next?"],
    };
  }

  const focus =
    summary.payablesSummary.overdueCount > 0
      ? `clear ${summary.payablesSummary.overdueCount} overdue payable record${summary.payablesSummary.overdueCount === 1 ? "" : "s"}`
      : summary.currentMonth.net < 0
        ? "reduce flexible spending and restore positive monthly cash flow"
        : summary.goalsSummary.count > 0 && summary.goalsSummary.completionPct < 100
          ? "direct part of your monthly surplus toward unfinished goals"
          : "keep categories and balances updated while maintaining your monthly surplus";

  return {
    answer: `Your current month net is ${money(summary.currentMonth.net)}, and your estimated net balance is ${money(summary.netBalance.estimatedNetWorth)}. The best next step is to ${focus}.`,
    followUps: ["Where did I spend the most?", "How can I improve my cash flow?"],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as unknown;
    const question =
      isRecord(body) && typeof body.question === "string"
        ? body.question.replace(/\s+/g, " ").trim().slice(0, 500)
        : "";

    if (!question) {
      return jsonResponse(
        {
          error: "question_required",
          message: "Ask a finance question before sending.",
        },
        400,
      );
    }

    const summaryResult = await getChatSummary();
    if (!summaryResult.ok) return summaryResult.response;

    const context = getCurrencyContext(body);
    const generated = await askGemini(
      summaryResult.summary,
      question,
      context,
    ).catch((error: unknown) => {
      console.warn("AI chat request failed; using finance fallback", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : undefined,
      });
      return null;
    });

    if (generated) {
      return jsonResponse({
        provider: "gemini",
        model:
          process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
          GEMINI_MODEL_FALLBACK,
        aiAvailable: true,
        fallback: false,
        ...generated,
      });
    }

    return jsonResponse({
      provider: "local-fallback",
      model: "finance-summary-fallback",
      aiAvailable: false,
      fallback: true,
      ...buildLocalAnswer(summaryResult.summary, question, context),
    });
  } catch (error) {
    console.error("AI chat fallback route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return jsonResponse(
      {
        error: "chat_unavailable",
        message: "AI chat is temporarily unavailable. Please try again.",
      },
      503,
    );
  }
}
