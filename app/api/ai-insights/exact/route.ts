import { getAppDateParts } from "@/lib/dates";
import { getPayableStatus } from "@/lib/finance-options";
import {
  BASE_CURRENCY,
  formatMoney,
  isSupportedCurrency,
  normalizeUsdToPkrRate,
  type SupportedCurrency,
} from "@/lib/currency";
import {
  buildAssetBreakdownAnswer,
  isAssetBreakdownRequest,
} from "@/lib/ai/asset-breakdown";
import {
  buildDeterministicFinanceAnswer,
  parseDeterministicFinanceQuestion,
  parseFinanceDateRange,
  type DeterministicFinanceData,
  type DeterministicFinanceIntent,
  type FinancePayableRecord,
} from "@/lib/ai/deterministic-finance-chat";
import { createClient } from "@/lib/supabase/server";
import { POST as postFallbackChat } from "../chat/route";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHAT_CONTEXT_COOKIE = "jamals_finance_chat_context";
const CHAT_CONTEXT_MAX_AGE = 60 * 30;
const ASSET_CONTEXT_QUESTION =
  "How many assets do I have and what are their names and values?";

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

type RawPayable = {
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};

type DirectChatAnswer = {
  answer: string;
  followUps: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuestion(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCurrencyContext(body: unknown): CurrencyContext {
  if (!isRecord(body)) {
    return {
      currency: BASE_CURRENCY,
      rate: normalizeUsdToPkrRate(undefined),
    };
  }

  return {
    currency:
      typeof body.currency === "string" && isSupportedCurrency(body.currency)
        ? body.currency
        : BASE_CURRENCY,
    rate: normalizeUsdToPkrRate(
      typeof body.rate === "number" || typeof body.rate === "string"
        ? Number(body.rate)
        : undefined,
    ),
  };
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getStoredFinanceQuestion(request: NextRequest) {
  const encoded = request.cookies.get(CHAT_CONTEXT_COOKIE)?.value;
  if (!encoded) return "";

  try {
    return decodeURIComponent(encoded).replace(/\s+/g, " ").trim().slice(0, 500);
  } catch {
    return "";
  }
}

function rememberFinanceQuestion(
  response: NextResponse,
  resolvedQuestion: string,
) {
  response.cookies.set({
    name: CHAT_CONTEXT_COOKIE,
    value: encodeURIComponent(resolvedQuestion.slice(0, 500)),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHAT_CONTEXT_MAX_AGE,
  });

  return response;
}

function getDirectChatAnswer(question: string): DirectChatAnswer | null {
  const normalized = normalizeQuestion(question);

  const asksHowToAddIncome =
    /\b(how|where|steps?|way|can i)\b.*\b(add|record|create|enter)\b.*\b(income|earning|earnings)\b/.test(
      normalized,
    ) ||
    /\b(add|record|create|enter)\b.*\b(income|earning|earnings)\b.*\b(how|where)\b/.test(
      normalized,
    );

  if (asksHowToAddIncome) {
    return {
      answer:
        "Open the Income page from the dashboard navigation, tap Add Income, enter the amount, source, account, and date, then save it. The new entry will appear in Income and Transactions.",
      followUps: [
        "How much did I earn this month?",
        "How many income entries do I have?",
      ],
    };
  }

  if (/^(hi|hey|hello|salam|assalam o alaikum|assalamualaikum)$/.test(normalized)) {
    return {
      answer:
        "Hi! Ask me for an exact spending, income, account, payable, or investment calculation. You can include a date, week, month, year, category, or asset name.",
      followUps: [
        "How much did I spend this month?",
        "How many assets do I have and what are their names?",
      ],
    };
  }

  if (/^(uff+|ugh+|hmm+|oh no|not correct|wrong)$/.test(normalized)) {
    return {
      answer:
        "Sorry, that answer did not follow your question correctly. Ask the full finance question again, or give only the missing date or category and I will apply it to your previous finance question.",
      followUps: [
        "How much did I spend on July 16, 2026?",
        "How many assets do I have and what are their names?",
      ],
    };
  }

  return null;
}

function resolveFinanceQuestion(
  question: string,
  previousQuestion: string,
  now: ReturnType<typeof getAppDateParts>,
) {
  const directIntent = parseDeterministicFinanceQuestion(question, now);
  if (directIntent) {
    return { resolvedQuestion: question, intent: directIntent };
  }

  if (!previousQuestion) {
    return { resolvedQuestion: question, intent: null };
  }

  const normalized = normalizeQuestion(question);
  const hasStandaloneRange = Boolean(parseFinanceDateRange(question, now));
  const looksLikeFollowUp =
    hasStandaloneRange ||
    /^(i am asking|im asking|i mean|for|on|in|about|same|the same|that|this|what about)\b/.test(
      normalized,
    ) ||
    /\b(all time|same date|same day|same week|same month|same year|that date|that day|that period)\b/.test(
      normalized,
    );

  if (!looksLikeFollowUp) {
    return { resolvedQuestion: question, intent: null };
  }

  const resolvedQuestion = `${previousQuestion} ${question}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  const resolvedIntent = parseDeterministicFinanceQuestion(resolvedQuestion, now);

  return {
    resolvedQuestion: resolvedIntent ? resolvedQuestion : question,
    intent: resolvedIntent,
  };
}

function createFallbackRequest(request: NextRequest, body: unknown) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  return new NextRequest(new URL("/api/ai-insights/chat", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function getExactFinanceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  intent: DeterministicFinanceIntent,
): Promise<DeterministicFinanceData> {
  if (intent.kind === "spending" || intent.kind === "income") {
    let query = supabase
      .from("transactions")
      .select("amount, date, type, categories(name)")
      .is("deleted_at", null);

    if (!intent.range.allTime) {
      query = query
        .gte("date", intent.range.start)
        .lte("date", intent.range.end);
    }

    const { data, error } = await query;
    if (error) throw new Error("transactions_query_failed");

    let categoryNames: string[] = [];
    if (intent.kind === "spending") {
      const categoriesResult = await supabase.from("categories").select("name");

      if (categoriesResult.error && intent.categoryRequested) {
        throw new Error("categories_query_failed");
      }

      categoryNames = (categoriesResult.data ?? [])
        .map((category) =>
          typeof category.name === "string" ? category.name.trim() : "",
        )
        .filter(Boolean);
    }

    return {
      transactions: data ?? [],
      categoryNames,
    };
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

export async function POST(request: NextRequest) {
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

  const directAnswer = getDirectChatAnswer(question);
  if (directAnswer) {
    return jsonResponse({
      provider: "local-conversation",
      model: "finance-chat-conversation-v1",
      aiAvailable: true,
      fallback: false,
      deterministic: true,
      ...directAnswer,
    });
  }

  const now = getAppDateParts();
  const previousQuestion = getStoredFinanceQuestion(request);
  const assetBreakdownRequested = isAssetBreakdownRequest(
    question,
    previousQuestion,
  );
  const { resolvedQuestion, intent } = resolveFinanceQuestion(
    question,
    previousQuestion,
    now,
  );

  if (!intent && !assetBreakdownRequested) {
    const forwardedBody = isRecord(body)
      ? { ...body, question: resolvedQuestion }
      : { question: resolvedQuestion };
    return postFallbackChat(createFallbackRequest(request, forwardedBody));
  }

  try {
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
    const money = (value: number) =>
      formatMoney(value, {
        currency: context.currency,
        usdToPkrRate: context.rate,
      });

    if (assetBreakdownRequested) {
      const data = await getExactFinanceData(supabase, { kind: "assets" });
      const calculated = buildAssetBreakdownAnswer(
        data.investments ?? [],
        money,
      );

      return rememberFinanceQuestion(
        jsonResponse({
          provider: "local-calculator",
          model: "exact-finance-ledger-v4",
          aiAvailable: true,
          fallback: false,
          deterministic: true,
          contextual: Boolean(previousQuestion),
          ...calculated,
        }),
        ASSET_CONTEXT_QUESTION,
      );
    }

    const data = await getExactFinanceData(supabase, intent!);
    const calculated = buildDeterministicFinanceAnswer({
      intent: intent!,
      question: resolvedQuestion,
      data,
      money,
    });

    return rememberFinanceQuestion(
      jsonResponse({
        provider: "local-calculator",
        model: "exact-finance-ledger-v4",
        aiAvailable: true,
        fallback: false,
        deterministic: true,
        contextual: resolvedQuestion !== question,
        ...calculated,
      }),
      resolvedQuestion,
    );
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
