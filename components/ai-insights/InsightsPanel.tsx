"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

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

const INSIGHT_STYLE = {
  positive: {
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/25",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/25",
  },
  tip: {
    icon: Lightbulb,
    color: "text-active",
    bg: "bg-active/10",
    border: "border-active/25",
  },
};

const SUMMARY_STYLE = {
  positive: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-border bg-surface-secondary text-text-secondary",
};

const PRIORITY_STYLE = {
  high: "border-danger/25 bg-danger/10 text-danger",
  medium: "border-warning/25 bg-warning/10 text-warning",
  low: "border-success/25 bg-success/10 text-success",
};

function HealthMeter({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? "var(--success)"
      : score >= 60
        ? "var(--warning)"
        : score >= 40
          ? "var(--warning)"
          : "var(--danger)";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="finance-panel flex min-w-0 flex-col items-center p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-wide text-text-secondary">
        Financial Health Score
      </p>

      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-text-primary">{score}</p>
          <p className="text-xs text-text-secondary">/ 100</p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-text-primary">{label}</p>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="summary-card min-h-[118px] animate-pulse bg-surface-secondary"
        />
      ))}
    </div>
  );
}

function formatPKR(value: number) {
  const absolute = Math.abs(Math.round(value)).toLocaleString("en-PK");
  return `${value < 0 ? "-" : ""}PKR ${absolute}`;
}

export default function InsightsPanel() {
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

  async function load({ regenerate = false } = {}) {
    if (regenerate) setRegenerating(true);
    else setLoading(true);

    setError("");
    setEmptyMessage("");

    try {
      const res = await fetch("/api/ai-insights", {
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
          json.message ?? "Add finance records to get personalized Gemini insights.",
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
  }

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
        body: JSON.stringify({ question: trimmed }),
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
        chatSubmitError instanceof Error
          ? chatSubmitError.message
          : UNAVAILABLE_MESSAGE,
      );
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-w-0 space-y-5">
      {loading ? (
        <SummarySkeleton />
      ) : summaryCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="summary-card min-h-[118px] min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-secondary">
                    {card.label}
                  </p>
                  <p className="mt-2 break-words text-xl font-bold text-text-primary [overflow-wrap:anywhere]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {card.caption}
                  </p>
                </div>
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] border ${SUMMARY_STYLE[card.tone]}`}
                >
                  <WalletCards size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {data && !loading ? (
            <HealthMeter score={data.healthScore} label={data.healthLabel} />
          ) : loading ? (
            <div className="finance-panel flex flex-col items-center gap-3 p-6">
              <div className="h-36 w-36 animate-pulse rounded-full bg-surface-secondary" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-secondary" />
            </div>
          ) : null}

          {summary ? (
            <div className="finance-panel min-w-0 p-5">
              <div className="mb-4 flex min-w-0 items-center gap-2.5">
                <span className="finance-icon-container" data-size="sm" data-tone="info">
                  <ArrowUpRight size={15} />
                </span>
                <h3 className="text-sm font-semibold text-text-primary">
                  Recent Trends
                </h3>
              </div>
              <div className="space-y-3">
                {summary.recentTrendTotals.map((trend) => (
                  <div
                    key={trend.month}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--oneui-tile-radius)] bg-surface-secondary px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {trend.month}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        Income {formatPKR(trend.income)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-bold ${
                          trend.net >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {formatPKR(trend.net)}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        Expense {formatPKR(trend.expenses)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-5">
          <div className="finance-panel min-w-0 p-5">
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[15px] bg-surface-secondary">
                  <Brain size={15} className="text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">
                    AI Insights
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Powered by Gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => load({ regenerate: true })}
                disabled={loading || regenerating}
                className="primary-action w-full px-3 py-2 text-xs sm:w-auto"
                aria-label="Regenerate AI insights"
                type="button"
              >
                <RefreshCw
                  size={13}
                  className={regenerating ? "animate-spin" : ""}
                />
                Regenerate
              </button>
            </div>

            {data && !data.aiAvailable ? (
              <div className="mb-4 rounded-[var(--oneui-tile-radius)] border border-warning/25 bg-warning/10 px-4 py-3">
                <p className="text-xs font-semibold text-warning">
                  Gemini response unavailable
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Showing safe local finance guidance for now.
                </p>
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-[var(--oneui-tile-radius)] bg-surface-secondary"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  {error}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {TRY_AGAIN_MESSAGE}
                </p>
                <button
                  onClick={() => load()}
                  className="finance-focus mt-3 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-hover hover:text-text-primary"
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : emptyMessage ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  No Gemini insights yet
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {emptyMessage}
                </p>
              </div>
            ) : data?.insights.length ? (
              <div className="space-y-3">
                {data.insights.map((insight) => {
                  const cfg = INSIGHT_STYLE[insight.type] || INSIGHT_STYLE.tip;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={`${insight.type}-${insight.title}`}
                      className={`min-w-0 rounded-[var(--oneui-tile-radius)] border p-4 ${cfg.bg} ${cfg.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          size={14}
                          className={`${cfg.color} mt-0.5 shrink-0`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`mb-1 break-words text-xs font-semibold ${cfg.color}`}
                          >
                            {insight.title}
                          </p>
                          <p className="break-words text-xs leading-relaxed text-text-secondary">
                            {insight.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  No insights yet
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Add finance records and refresh this panel.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="finance-panel min-w-0 p-5">
              <div className="mb-4 flex min-w-0 items-center gap-2.5">
                <span className="finance-icon-container" data-size="sm" data-tone="success">
                  <CheckCircle2 size={15} />
                </span>
                <h3 className="text-sm font-semibold text-text-primary">
                  Suggested Actions
                </h3>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-[var(--oneui-tile-radius)] bg-surface-secondary"
                    />
                  ))}
                </div>
              ) : data?.suggestedActions.length ? (
                <div className="space-y-3">
                  {data.suggestedActions.map((action) => (
                    <div
                      key={`${action.priority}-${action.title}`}
                      className="rounded-[var(--oneui-tile-radius)] bg-surface-secondary p-3"
                    >
                      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                        <p className="min-w-0 break-words text-xs font-semibold text-text-primary">
                          {action.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${PRIORITY_STYLE[action.priority]}`}
                        >
                          {action.priority}
                        </span>
                      </div>
                      <p className="break-words text-xs leading-relaxed text-text-secondary">
                        {action.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-text-secondary">
                  Suggested actions will appear after Gemini reviews your summary.
                </p>
              )}
            </div>

            <div className="finance-panel min-w-0 p-5">
              <div className="mb-4 flex min-w-0 items-center gap-2.5">
                <span className="finance-icon-container" data-size="sm" data-tone="info">
                  <Sparkles size={15} />
                </span>
                <h3 className="text-sm font-semibold text-text-primary">
                  Category Focus
                </h3>
              </div>

              {topCategories.length ? (
                <div className="space-y-3">
                  {topCategories.map((category) => (
                    <div
                      key={category.category}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--oneui-tile-radius)] bg-surface-secondary px-3 py-2.5"
                    >
                      <p className="min-w-0 break-words text-xs font-semibold text-text-primary">
                        {category.category}
                      </p>
                      <p className="shrink-0 text-xs font-bold text-text-secondary">
                        {formatPKR(category.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-text-secondary">
                  Category totals appear after expenses are categorized.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="finance-panel min-w-0 p-5">
        <div className="mb-4 flex min-w-0 items-center gap-2.5">
          <span className="finance-icon-container" data-size="sm" data-tone="info">
            <MessageCircle size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              Finance Chat
            </h3>
            <p className="text-xs text-text-secondary">Powered by Gemini</p>
          </div>
        </div>

        <div className="mb-4 max-h-[360px] min-h-[180px] space-y-3 overflow-y-auto rounded-[var(--oneui-tile-radius)] border border-border bg-surface-secondary p-3">
          {chatMessages.length === 0 ? (
            <div className="flex h-full min-h-[150px] items-center justify-center text-center">
              <p className="max-w-sm text-xs leading-relaxed text-text-secondary">
                Ask about this month&apos;s spending, payables, goals, investments, or trend totals.
              </p>
            </div>
          ) : (
            chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[18px] px-3.5 py-2.5 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "bg-active text-white"
                      : "bg-card text-text-secondary ring-1 ring-border"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {chatLoading ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-[18px] bg-card px-3.5 py-2.5 text-xs text-text-secondary ring-1 ring-border">
                <Loader2 size={13} className="animate-spin" />
                Thinking
              </div>
            </div>
          ) : null}
        </div>

        {chatError ? (
          <div className="mb-3 rounded-[var(--oneui-tile-radius)] border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
            {chatError}
          </div>
        ) : null}

        <form onSubmit={submitQuestion} className="flex min-w-0 gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="finance-control min-h-11 min-w-0 flex-1 px-3 text-sm text-text-primary outline-none"
            placeholder="Ask a finance question..."
            maxLength={500}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || chatLoading}
            className="primary-action min-h-11 px-3"
            aria-label="Send finance question"
          >
            {chatLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
