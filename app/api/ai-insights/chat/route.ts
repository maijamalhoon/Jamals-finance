import { getAppDateParts, getAppMonthRange } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  buildDeterministicFinanceAnswer,
  parseDeterministicFinanceQuestion,
  type DeterministicFinanceData,
  type DeterministicFinanceIntent,
  type FinancePayableRecord,
} from "@/lib/ai/deterministic-finance-chat";
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

function moneyFormatter(context: CurrencyContext) {
  return (value: number) =>
    formatMoney(value, {
      currency: context.currency,
      usdToPkrRate: context.rate,
    });
}

async function getExactFinanceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: DeterministicFinanceIntent,
): Promise<DeterministicFinanceData> {
  if (intent.kind === "spending" || intent.kind === "income") {
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, date, type")
      .gte("date", intent.range.start)
      .lte("date", intent.range.end)
      .is("deleted_at", null);

    if (error) throw new Error("transactions_query_failed");
    return { transactions: data ?? [] };
  }

  if (intent.kind === "accounts") {
    const { data, error } = await supabase.from("accounts").select("status");
    if (error) throw new Error("accounts_query_failed");
    return { accounts: data ?? [] };
  }

  if (intent.kind === "payables") {
    const { data, error } = await supabase
      .from("liabilities")
      .select("remaining_amount, due_date, status");
    if (error) throw new Error("payables_query_failed");

    const payables = ((data ?? []) as RawPayable[]).map(
      (payable): FinancePayableRecord => ({
        remaining_amount: payable.remaining_amount,
        status: getPayableStatus({
          status: payable.status ?? "pending",
          remaining_amount: toNumber(payable.remaining_amount),
          due_date: payable.due_date ?? null,
        }),
      }),
    );
    return { payables };
  }

  const { data, error } = await supabase
    .from("investments")
    .select(
      "id, name, symbol, asset_id, quantity, purchase_price, current_price, purchased_at",
    );
  if (error) throw new Error("investments_query_failed");
  return { investments: data ?? [] };
}

async function getChatSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { year, month, firstDay, lastDay } = getAppMonthRange();
  const [
    transactionsResult,
    goalsResult,
    investmentsResult,
    payablesResult,
    accountsResult,
  ] = await Promise.all([
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
    supabase.from("accounts").select("balance").eq("status", "active"),
  ]);

  const failedQueries = [
    transactionsResult.error,
    goalsResult.error,
    investmentsResult.error,
    payablesResult.error,
    accountsResult.error,
  ].filter(Boolean);

  if (failedQueries.length > 0) {
    throw new Error("finance_summary_query_failed");
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
    .sort((left, right) => right.amount - left.amount)
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
      estimatedNetWorth: round(
        cashBalance + investmentValue - payableRemaining,
      ),
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

  return summary;
}

function buildPrompt(
  summary: ChatSummary,
  question: string,
  context: CurrencyContext,
) {
  return `You are the finance chat assistant inside Jamal's Finance.
Answer only from the summarized finance data below. Never invent records, names, transactions, dates, or calculations.
Use ${context.currency} for all user-facing money values. Stored values are PKR and 1 USD = ${context.rate.toFixed(2)} PKR. ${context.live ? "The exchange rate is live." : "The exchange rate is approximate."}
If the requested answer cannot be calculated exactly from this summary, clearly say the required data is unavailable. Keep the answer concise.

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
          temperature: 0.2,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(18_000),
    },
  );

  const json = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok || !json || json.error) {
    console.warn("AI chat provider unavailable; using exact summary fallback", {
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

function buildLocalSummaryAnswer(
  summary: ChatSummary,
  context: CurrencyContext,
) {
  const money = moneyFormatter(context);
  return {
    answer: `I can calculate exact spending, income, account count, payable totals, and recorded investment profit. For this question, the available summary only shows current-month net of ${money(summary.currentMonth.net)} and estimated net balance of ${money(summary.netBalance.estimatedNetWorth)}; ask for one exact metric or date range.`,
    followUps: [
      "How much did I spend this month?",
      "How much is currently payable?",
    ],
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

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        {
          error: "authentication_required",
          message: "Please log in before using AI insights.",
        },
        401,
      );
    }

    const context = getCurrencyContext(body);
    const intent = parseDeterministicFinanceQuestion(
      question,
      getAppDateParts(),
    );

    if (intent) {
      try {
        const data = await getExactFinanceData(supabase, intent);
        const calculated = buildDeterministicFinanceAnswer({
          intent,
          question,
          data,
          money: moneyFormatter(context),
        });

        return jsonResponse({
          provider: "local-calculator",
          model: "exact-finance-ledger-v1",
          aiAvailable: true,
          fallback: false,
          deterministic: true,
          ...calculated,
        });
      } catch (error) {
        console.error("Exact finance chat calculation failed", {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : undefined,
        });
        return jsonResponse(
          {
            error: "finance_data_unavailable",
            message:
              "I could not read the required finance records, so I did not estimate an answer. Please try again.",
          },
          503,
        );
      }
    }

    const summary = await getChatSummary(supabase);
    const generated = await askGemini(summary, question, context).catch(
      (error: unknown) => {
        console.warn("AI chat request failed; using exact summary fallback", {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : undefined,
        });
        return null;
      },
    );

    if (generated) {
      return jsonResponse({
        provider: "gemini",
        model:
          process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") ||
          GEMINI_MODEL_FALLBACK,
        aiAvailable: true,
        fallback: false,
        deterministic: false,
        ...generated,
      });
    }

    return jsonResponse({
      provider: "local-fallback",
      model: "finance-summary-fallback",
      aiAvailable: false,
      fallback: true,
      deterministic: false,
      ...buildLocalSummaryAnswer(summary, context),
    });
  } catch (error) {
    console.error("AI chat route failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return jsonResponse(
      {
        error: "chat_unavailable",
        message: "Finance chat is temporarily unavailable. Please try again.",
      },
      503,
    );
  }
}
