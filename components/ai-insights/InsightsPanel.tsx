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
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  tip: {
    icon: Lightbulb,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

function HealthMeter({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "#22c55e"
    : score >= 60 ? "#f59e0b"
    : score >= 40 ? "#f97316"
    : "#ef4444";
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="finance-panel flex flex-col items-center p-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
        Financial Health Score
      </p>

      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#1f2937"
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
          <p className="text-white text-3xl font-bold">{score}</p>
          <p className="text-xs text-slate-500">/ 100</p>
        </div>
      </div>

      <p className="text-white font-semibold mt-4 text-sm">{label}</p>
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
    <div className="space-y-4">
      {/* Health Score */}
      {data && !loading && (
        <HealthMeter score={data.healthScore} label={data.healthLabel} />
      )}
      {loading && (
        <div className="finance-panel flex flex-col items-center gap-3 p-6">
          <div className="h-36 w-36 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        </div>
      )}

      {/* Insights Feed */}
      <div className="finance-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[15px] bg-white/[0.08]">
              <Brain size={15} className="text-white/80" />
            </div>
            <h3 className="text-white font-medium text-sm">AI Insights</h3>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="icon-button h-8 w-8 rounded-2xl"
            title="Refresh"
          >
            <RefreshCw
              size={12}
              className={`text-slate-400 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {loading ?
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-white/[0.06]"
              />
            ))}
          </div>
        : error ?
          <div className="py-10 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={load}
              className="mt-3 text-xs text-white/70 hover:text-white"
            >
              Try again
            </button>
          </div>
        : <div className="space-y-3">
            {data?.insights.map((ins, i) => {
              const cfg = INSIGHT_STYLE[ins.type] || INSIGHT_STYLE.tip;
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      size={14}
                      className={`${cfg.color} flex-shrink-0 mt-0.5`}
                    />
                    <div>
                      <p className={`text-xs font-semibold mb-1 ${cfg.color}`}>
                        {ins.title}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {ins.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}
