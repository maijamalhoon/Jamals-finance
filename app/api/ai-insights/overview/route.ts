import type { AppLanguage } from "@/lib/i18n/config";
import { resolveRequestLanguage } from "@/lib/i18n/request-language";
import { NextRequest, NextResponse } from "next/server";

import { GET as getLegacyInsights } from "../route";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

const COPY: Record<
  AppLanguage,
  { authRequired: string; emptyMessage: string }
> = {
  en: {
    authRequired: "Please log in before using AI insights.",
    emptyMessage:
      "Add or refresh finance records to build your personalized briefing.",
  },
  ur: {
    authRequired: "AI Insights استعمال کرنے سے پہلے لاگ اِن کریں۔",
    emptyMessage:
      "اپنی ذاتی مالی بریفنگ بنانے کے لیے مالی ریکارڈ شامل یا تازہ کریں۔",
  },
  ar: {
    authRequired: "يرجى تسجيل الدخول قبل استخدام AI Insights.",
    emptyMessage:
      "أضف السجلات المالية أو حدّثها لإنشاء موجزك المالي المخصص.",
  },
  hi: {
    authRequired: "AI Insights उपयोग करने से पहले लॉग इन करें।",
    emptyMessage:
      "अपनी व्यक्तिगत वित्तीय ब्रीफिंग बनाने के लिए वित्त रिकॉर्ड जोड़ें या रीफ्रेश करें।",
  },
  es: {
    authRequired: "Inicia sesión antes de usar AI Insights.",
    emptyMessage:
      "Añade o actualiza registros financieros para crear tu informe personalizado.",
  },
};

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

function gracefulBriefingFallback(language: AppLanguage) {
  return safeJson({
    empty: true,
    message: COPY[language].emptyMessage,
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
  const language = resolveRequestLanguage(request);
  const copy = COPY[language.code];

  try {
    const legacyResponse = await getLegacyInsights(request);
    const payload = (await legacyResponse.json().catch(() => null)) as unknown;

    if (!legacyResponse.ok || !isRecord(payload)) {
      if (legacyResponse.status === 401) {
        return safeJson(
          {
            error: "authentication_required",
            message: copy.authRequired,
          },
          401,
        );
      }

      return gracefulBriefingFallback(language.code);
    }

    const providerAvailable = payload.aiAvailable === true;
    const sanitized: UnknownRecord = {
      ...payload,
      aiAvailable: true,
      intelligenceMode: providerAvailable
        ? "ai-assisted"
        : "local-calculation",
    };

    if (payload.empty === true) {
      sanitized.message = copy.emptyMessage;
    } else {
      delete sanitized.message;
    }

    return safeJson(sanitized);
  } catch (error) {
    console.error("AI briefing wrapper failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : undefined,
    });

    return gracefulBriefingFallback(language.code);
  }
}
