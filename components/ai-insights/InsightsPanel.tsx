"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Landmark,
  Lightbulb,
  Loader2,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";

type InsightType = "positive" | "warning" | "tip";
type SummaryTone = "positive" | "warning" | "danger" | "info" | "neutral";
type ActionPriority = "high" | "medium" | "low";

interface Insight {
  type: InsightType;
  title: string;
  message: string;
}

interface SuggestedAction {
  title: string;
  description: string;
  priority: ActionPriority;
}

interface SummaryCard {
  label: string;
  value: string;
  caption: string;
  tone: SummaryTone;
}

interface FinanceSummary {
  currentMonth: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  netBalance: {
    estimatedNetWorth: number;
  };
  categorySpendingTotals: { category: string; amount: number }[];
  goalsSummary: {
    count: number;
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
  recentTrendTotals: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
}

interface AIData {
  healthScore: number;
  healthLabel: string;
  insights: Insight[];
  suggestedActions: SuggestedAction[];
  summaryCards: SummaryCard[];
  financeSummary: FinanceSummary;
  provider: "gemini";
  model: string;
  aiAvailable: boolean;
  message?: string;
}

interface AIEmptyData {
  empty: true;
  message?: string;
  insights: [];
  suggestedActions: [];
  summaryCards: SummaryCard[];
  financeSummary: FinanceSummary;
  aiAvailable: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const UNAVAILABLE_MESSAGE = "AI insights are temporarily unavailable.";
const TRY_AGAIN_MESSAGE = "Try again later.";

const STARTER_PROMPTS = [
  "Where did I spend the most?",
  "How can I improve my cash flow?",
  "What should I focus on next?",
];

const SUMMARY_ICONS = [Landmark, ReceiptText, WalletCards, Clock3];

const INSIGHT_STYLE = {
  positive: {
    icon: TrendingUp,
    color: "text-success",
    wash: "bg-success/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    wash: "bg-warning/10",
  },
  tip: {
    icon: Lightbulb,
    color: "text-active",
    wash: "bg-active/10",
  },
};

const SUMMARY_TONE = {
  positive: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-text-secondary",
};

const PRIORITY_STYLE = {
  high: "bg-danger/10 text-danger",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
};

function HealthMeter({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "var(--success)"
    : score >= 60 ? "var(--warning)"
    : score >= 40 ? "var(--warning)"
    : "var(--danger)";
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex min-w-0 items-center gap-4 sm:gap-5 lg:flex-col lg:items-start lg:gap-4">
      <div
        className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28"
        role="progressbar"
        aria-label="Financial health score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            {score}
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          Financial health
        </p>
        <p className="mt-1.5 text-lg font-semibold tracking-tight text-text-primary">
          {label}
        </p>
        <p className="mt-1 max-w-[22rem] text-xs leading-relaxed text-text-secondary">
          A live view of your cash flow, commitments, and recent financial
          activity.
        </p>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <section
      className="grid min-w-0 overflow-hidden rounded-[26px] bg-card shadow-[var(--shadow-sm)] lg:grid-cols-[260px_minmax(0,1fr)]"
      aria-label="Loading financial overview"
    >
      <div className="flex items-center gap-4 bg-surface-secondary p-5 sm:p-6 lg:flex-col lg:items-start">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-skeleton sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-skeleton" />
          <div className="h-6 w-36 animate-pulse rounded-full bg-skeleton" />
          <div className="h-3 w-full max-w-52 animate-pulse rounded-full bg-skeleton" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-7 p-5 sm:p-6 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="min-w-0 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded-full bg-skeleton" />
            <div className="h-6 w-full max-w-36 animate-pulse rounded-full bg-skeleton" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-skeleton" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function InsightsPanel() {
  const { currency, formatCurrency, live, rate } = useCurrency();
  const [data, setData] = useState<AIData | null>(null);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const topCategories = useMemo(
    () => summary?.categorySpendingTotals.slice(0, 4) ?? [],
    [summary],
  );
  const maxCategoryAmount = useMemo(
    () => Math.max(...topCategories.map((category) => category.amount), 1),
    [topCategories],
  );

  const load = useCallback(async ({ regenerate = false } = {}) => {
    if (regenerate) setRegenerating(true);
    else setLoading(true);

    setError("");
    setEmptyMessage("");

    try {
      const params = new URLSearchParams({
        currency,
        rate: String(rate),
        rateLive: String(live),
      });
      const res = await fetch(`/api/ai-insights?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as
        | AIData
        | AIEmptyData
        | { error?: string; message?: string };

      if (!res.ok || "error" in json) {
        throw new Error(json.message ?? UNAVAILABLE_MESSAGE);
      }

      if ("summaryCards" in json) setSummaryCards(json.summaryCards);
      if ("financeSummary" in json) setSummary(json.financeSummary);

      if ("empty" in json && json.empty) {
        setData(null);
        setEmptyMessage(
          json.message ??
            "Add finance records to get personalized Gemini insights.",
        );
        return;
      }

      setData(json as AIData);
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error ? loadError.message : UNAVAILABLE_MESSAGE,
      );
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [currency, live, rate]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || chatLoading) return;

    setQuestion("");
    setChatError("");
    setChatLoading(true);
    setChatMessages((messages) => [
      ...messages,
      { role: "user", content: trimmed },
    ]);

    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          currency,
          rate,
          rateLive: live,
        }),
      });
      const json = (await res.json()) as
        | { answer?: string; followUps?: string[]; message?: string }
        | { error?: string; message?: string };

      if (!res.ok || !("answer" in json) || !json.answer) {
        throw new Error(json.message ?? UNAVAILABLE_MESSAGE);
      }

      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", content: json.answer ?? UNAVAILABLE_MESSAGE },
      ]);
    } catch (chatSubmitError) {
      setChatError(
        chatSubmitError instanceof Error ?
          chatSubmitError.message
        : UNAVAILABLE_MESSAGE,
      );
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {loading ?
        <OverviewSkeleton />
      : data || summaryCards.length > 0 ?
        <section
          className="grid min-w-0 overflow-hidden rounded-[26px] bg-card shadow-[var(--shadow-sm)] lg:grid-cols-[260px_minmax(0,1fr)]"
          aria-label="Financial overview"
        >
          <div className="bg-surface-secondary p-5 sm:p-6">
            {data ?
              <HealthMeter
                score={data.healthScore}
                label={data.healthLabel}
              />
            : <div className="flex min-h-28 items-center text-sm text-text-secondary">
                Your health score will appear once enough finance activity is
                available.
              </div>
            }
          </div>

          {summaryCards.length > 0 ?
            <div
              data-mobile-summary-grid
              className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-7 p-5 sm:p-6 xl:grid-cols-4 xl:items-center"
            >
              {summaryCards.map((card, index) => {
                const Icon = SUMMARY_ICONS[index % SUMMARY_ICONS.length];

                return (
                  <div key={card.label} className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        size={15}
                        className={`shrink-0 ${SUMMARY_TONE[card.tone]}`}
                        aria-hidden="true"
                      />
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                        {card.label}
                      </p>
                    </div>
                    <p className="mt-2 break-words text-base font-semibold tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-lg">
                      {card.value}
                    </p>
                    <p className="mt-1 break-words text-[11px] leading-relaxed text-text-secondary">
                      {card.caption}
                    </p>
                  </div>
                );
              })}
            </div>
          : null}
        </section>
      : null}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <section className="min-w-0 rounded-[26px] bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Sparkles size={19} className="shrink-0 text-active" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-text-primary">
                  Your financial briefing
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Personalized by Gemini from your latest activity
                </p>
              </div>
            </div>
            <button
              onClick={() => load({ regenerate: true })}
              disabled={loading || regenerating}
              className="finance-focus inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-secondary px-3.5 text-xs font-semibold text-text-primary transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Regenerate AI insights"
              type="button"
            >
              <RefreshCw
                size={14}
                className={regenerating ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {data && !data.aiAvailable ?
            <div className="mb-5 flex items-start gap-3 rounded-[18px] bg-warning/10 px-4 py-3.5">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-warning"
              />
              <div>
                <p className="text-xs font-semibold text-warning">
                  Gemini is temporarily unavailable
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Safe local finance guidance is shown until the connection is
                  restored.
                </p>
              </div>
            </div>
          : null}

          {loading ?
            <div className="space-y-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-skeleton" />
                  <div className="min-w-0 flex-1 space-y-2 py-1">
                    <div className="h-3 w-32 animate-pulse rounded-full bg-skeleton" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-skeleton" />
                    <div className="h-3 w-4/5 animate-pulse rounded-full bg-skeleton" />
                  </div>
                </div>
              ))}
            </div>
          : error ?
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <Bot size={28} className="text-text-secondary" />
              <p className="mt-3 text-sm font-semibold text-text-primary">
                {error}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {TRY_AGAIN_MESSAGE}
              </p>
              <button
                onClick={() => load()}
                className="finance-focus mt-4 rounded-full bg-surface-secondary px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-hover"
                type="button"
              >
                Try again
              </button>
            </div>
          : emptyMessage ?
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <Sparkles size={28} className="text-active" />
              <p className="mt-3 text-sm font-semibold text-text-primary">
                Your briefing is ready to grow
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
                {emptyMessage}
              </p>
            </div>
          : data?.insights.length ?
            <div className="space-y-5">
              {data.insights.map((insight) => {
                const config = INSIGHT_STYLE[insight.type] || INSIGHT_STYLE.tip;
                const Icon = config.icon;

                return (
                  <article
                    key={`${insight.type}-${insight.title}`}
                    className="flex min-w-0 items-start gap-3.5"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.wash}`}
                    >
                      <Icon size={16} className={config.color} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h4 className="break-words text-sm font-semibold text-text-primary">
                        {insight.title}
                      </h4>
                      <p className="mt-1 break-words text-xs leading-5 text-text-secondary">
                        {insight.message}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          : <div className="flex min-h-56 items-center justify-center text-center">
              <p className="max-w-sm text-sm text-text-secondary">
                Add finance records and refresh to generate your briefing.
              </p>
            </div>
          }
        </section>

        <aside className="min-w-0 rounded-[26px] bg-surface-secondary p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-success" />
            <div>
              <h3 className="text-base font-semibold tracking-tight text-text-primary">
                Next best moves
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Small steps with the biggest impact
              </p>
            </div>
          </div>

          {loading ?
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-2 rounded-[18px] bg-card p-4">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-skeleton" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-skeleton" />
                </div>
              ))}
            </div>
          : data?.suggestedActions.length ?
            <ol className="space-y-4">
              {data.suggestedActions.map((action, index) => (
                <li
                  key={`${action.priority}-${action.title}`}
                  className="rounded-[18px] bg-card p-4 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-active/10 text-[11px] font-bold text-active">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <h4 className="min-w-0 break-words text-xs font-semibold leading-5 text-text-primary">
                          {action.title}
                        </h4>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${PRIORITY_STYLE[action.priority]}`}
                        >
                          {action.priority}
                        </span>
                      </div>
                      <p className="mt-1.5 break-words text-xs leading-5 text-text-secondary">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          : <div className="flex min-h-48 items-center justify-center text-center">
              <p className="max-w-xs text-xs leading-relaxed text-text-secondary">
                Suggested actions will appear after Gemini reviews your
                summary.
              </p>
            </div>
          }
        </aside>
      </div>

      {summary ?
        <section className="grid min-w-0 gap-7 rounded-[26px] bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6 lg:grid-cols-2 lg:gap-10">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <WalletCards size={18} className="text-info" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Spending focus
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Your highest expense categories
                </p>
              </div>
            </div>

            {topCategories.length ?
              <div className="space-y-4">
                {topCategories.map((category) => (
                  <div key={category.category} className="min-w-0">
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {category.category}
                      </p>
                      <p className="shrink-0 text-xs font-semibold text-text-primary">
                        {formatCurrency(category.amount)}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                      <div
                        className="h-full rounded-full bg-active transition-[width] duration-700"
                        style={{
                          width: `${Math.max(
                            (category.amount / maxCategoryAmount) * 100,
                            5,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            : <p className="py-8 text-center text-xs text-text-secondary">
                Category totals appear after expenses are categorized.
              </p>
            }
          </div>

          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <ArrowUpRight size={18} className="text-success" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Recent pulse
                </h3>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Net movement across recent months
                </p>
              </div>
            </div>

            {summary.recentTrendTotals.length ?
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
                {summary.recentTrendTotals.map((trend) => (
                  <div
                    key={trend.month}
                    className="min-w-0 rounded-[18px] bg-surface-secondary px-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                        {trend.month}
                      </p>
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          trend.net >= 0 ? "bg-success" : "bg-danger"
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-2 break-words text-sm font-semibold [overflow-wrap:anywhere] ${
                        trend.net >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatCurrency(trend.net)}
                    </p>
                    <p className="mt-1 text-[10px] text-text-secondary">
                      {formatCurrency(trend.income)} in · {formatCurrency(trend.expenses)} out
                    </p>
                  </div>
                ))}
              </div>
            : <p className="py-8 text-center text-xs text-text-secondary">
                Recent trends will appear after you add transactions.
              </p>
            }
          </div>
        </section>
      : null}

      <section className="min-w-0 rounded-[26px] bg-card p-4 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="mb-5 flex min-w-0 items-center gap-3 px-1">
          <MessageCircle size={19} className="shrink-0 text-active" />
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-text-primary">
              Ask your finances
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary">
              Get answers grounded in your own financial summary
            </p>
          </div>
        </div>

        <div
          className={`mb-4 max-h-[420px] overflow-y-auto ${
            chatMessages.length === 0 ? "" : "min-h-[180px] space-y-3 py-2"
          }`}
          aria-live="polite"
        >
          {chatMessages.length === 0 ?
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-[22px] bg-surface-secondary px-4 py-7 text-center">
              <Sparkles size={24} className="text-active" />
              <p className="mt-3 text-sm font-semibold text-text-primary">
                What would you like to understand?
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-text-secondary">
                Ask about spending, cash flow, payables, goals, investments, or
                recent trends.
              </p>
              <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuestion(prompt)}
                    className="finance-focus rounded-full bg-card px-3.5 py-2 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-xs)] transition-colors hover:text-text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          : chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[20px] px-4 py-3 text-xs leading-5 sm:max-w-[75%] ${
                    message.role === "user" ?
                      "bg-active text-text-inverse"
                    : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          }
          {chatLoading ?
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-[20px] bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
                <Loader2 size={14} className="animate-spin" />
                Thinking
              </div>
            </div>
          : null}
        </div>

        {chatError ?
          <div className="mb-3 rounded-[16px] bg-danger/10 px-4 py-3 text-xs font-semibold text-danger">
            {chatError}
          </div>
        : null}

        <form
          onSubmit={submitQuestion}
          className="finance-focus flex min-w-0 items-center gap-2 rounded-[20px] bg-surface-secondary p-1.5"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Ask a finance question..."
            aria-label="Finance question"
            maxLength={500}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || chatLoading}
            className="primary-action h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-[16px] p-0 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send finance question"
          >
            {chatLoading ?
              <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
          </button>
        </form>
      </section>
    </div>
  );
}
