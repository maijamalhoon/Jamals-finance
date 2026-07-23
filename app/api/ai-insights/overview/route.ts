import { NextRequest, NextResponse } from "next/server";

import { GET as getLegacyInsights } from "../route";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function safeJson(payload: UnknownRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function emptyFinanceSummary() {
  return {
    currency: "PKR",
    baseCurrency: "PKR",
    displayCurrency: "PKR",
    exchangeRate: {
      usdToPkr: 1,
      live: false,
    },
    period: {
      currentMonth: "",
      currentMonthStart: "",
      currentMonthEnd: "",
    },
    currentMonth: {
      income: 0,
      expenses: 0,
      net: 0,
      savingsRate: 0,
    },
    netBalance: {
      cashBalance: 0,
      investmentValue: 0,
      payableRemaining: 0,
      estimatedNetWorth: 0,
    },
    categorySpendingTotals: [],
    goalsSummary: {
      count: 0,
      completedCount: 0,
      totalTarget: 0,
      totalSaved: 0,
      completionPct: 0,
    },
    investmentSummary: {
      count: 0,
      totalInvested: 0,
      currentValue: 0,
      totalPnL: 0,
      totalPnLPct: 0,
      byType: [],
    },
    payablesSummary: {
      count: 0,
      totalOriginal: 0,
      paid: 0,
      remaining: 0,
      overdueCount: 0,
    },
    recentTrendTotals: [],
  };
}

function gracefulBriefingFallback() {
  return safeJson({
    empty: true,
    message:
      "Your finance workspace is available. Add or refresh finance records to build a personalized briefing.",
    provider: "local-calculator",
    model: "finance-briefing-fallback-v1",
    aiAvailable: true,
    intelligenceMode: "local-calculation",
    generatedAt: new Date().toISOString(),
    summaryCards: [],
    financeSummary: emptyFinanceSummary(),
    insights: [],
    suggestedActions: [],
  });
}

export async function GET(request: NextRequest) {
  try {
    const legacyResponse = await getLegacyInsights(request);
    const payload = (await legacyResponse.json().catch(() => null)) as unknown;

    if (!legacyResponse.ok || !isRecord(payload)) {
      if (legacyResponse.status === 401) {
        return safeJson(
          {
            error: "authentication_required",
            message: "Please log in before using AI insights.",
          },
          401,
        );
      }

      return gracefulBriefingFallback();
    }

    const providerAvailable = payload.aiAvailable === true;
    const sanitized: UnknownRecord = {
      ...payload,
      aiAvailable: true,
      intelligenceMode: providerAvailable
        ? "ai-assisted"
        : "local-calculation",
    };

    delete sanitized.message;

    return safeJson(sanitized);
  } catch (error) {
    console.error("AI briefing wrapper failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return gracefulBriefingFallback();
  }
}
