"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

interface Insight {
  type: "positive" | "warning" | "tip";
  title: string;
  message: string;
}

interface AIData {
  healthScore: number;
  healthLabel: string;
  insights: Insight[];
}

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

function HealthMeter({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "var(--success)"
    : score >= 60 ? "var(--warning)"
    : score >= 40 ? "var(--warning)"
    : "var(--danger)";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

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
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circ}
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

export default function InsightsPanel() {
  const [data, setData] = useState<AIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai-insights");
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.error) throw new Error();
      setData(json);
    } catch {
      setError("Could not load insights. Make sure your API key is set.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-w-0 space-y-4">
      {/* Health Score */}
      {data && !loading && (
        <HealthMeter score={data.healthScore} label={data.healthLabel} />
      )}
      {loading && (
        <div className="finance-panel flex flex-col items-center gap-3 p-6">
          <div className="h-36 w-36 animate-pulse rounded-full bg-surface-secondary" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-secondary" />
        </div>
      )}

      {/* Insights Feed */}
      <div className="finance-panel min-w-0 p-5">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[15px] bg-surface-secondary">
              <Brain size={15} className="text-text-secondary" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              AI Insights
            </h3>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="icon-button h-8 w-8 rounded-2xl"
            aria-label="Refresh AI insights"
            title="Refresh"
            type="button"
          >
            <RefreshCw
              size={12}
              className={`text-text-secondary ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {loading ?
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-surface-secondary"
              />
            ))}
          </div>
        : error ?
          <div className="py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              onClick={load}
              className="finance-focus mt-3 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-hover hover:text-text-primary"
              type="button"
            >
              Try again
            </button>
          </div>
        : data?.insights.length ?
          <div className="space-y-3">
            {data?.insights.map((ins, i) => {
              const cfg = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.tip;
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  className={`min-w-0 rounded-[var(--oneui-tile-radius)] border p-4 ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      size={14}
                      className={`${cfg.color} mt-0.5 flex-shrink-0`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`mb-1 break-words text-xs font-semibold ${cfg.color}`}
                      >
                        {ins.title}
                      </p>
                      <p className="break-words text-xs leading-relaxed text-text-secondary">
                        {ins.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        : <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text-primary">
              No insights yet
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Add more transactions and refresh this panel.
            </p>
          </div>
        }
      </div>
    </div>
  );
}
