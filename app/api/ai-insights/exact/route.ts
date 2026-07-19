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
  buildDeterministicFinanceAnswer,
  parseDeterministicFinanceQuestion,
  type DeterministicFinanceData,
  type DeterministicFinanceIntent,
  type FinancePayableRecord,
} from "@/lib/ai/deterministic-finance-chat";
import { createClient } from "@/lib/supabase/server";
import { POST as postFallbackChat } from "../chat/route";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CurrencyContext = {
  currency: SupportedCurrency;
  rate: number;
};

type RawPayable = {
  remaining_amount?: number | string | null;
  due_date?: string | null;
  status?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  const intent = parseDeterministicFinanceQuestion(
    question,
    getAppDateParts(),
  );

  if (!intent) {
    return postFallbackChat(createFallbackRequest(request, body));
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
    const data = await getExactFinanceData(supabase, intent);
    const calculated = buildDeterministicFinanceAnswer({
      intent,
      question,
      data,
      money: (value) =>
        formatMoney(value, {
          currency: context.currency,
          usdToPkrRate: context.rate,
        }),
    });

    return jsonResponse({
      provider: "local-calculator",
      model: "exact-finance-ledger-v2",
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
