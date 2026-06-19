"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

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

const ICON_MAP = {
  positive: {
    icon: TrendingUp,
    color: "text-green-400",
    border: "border-green-400",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    border: "border-yellow-400",
  },
  tip: { icon: Lightbulb, color: "text-blue-400", border: "border-blue-400" },
};

export default function AIInsightPanel() {
  const [data, setData] = useState<AIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai-insights")
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topInsight = data?.insights?.[0];
  const cfg = topInsight ? (ICON_MAP[topInsight.type] ?? ICON_MAP.tip) : null;
  const InsightIcon = cfg?.icon;

  const scoreColor =
    !data ? "text-slate-400"
    : data.healthScore >= 80 ? "text-green-400"
    : data.healthScore >= 60 ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="finance-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[15px] bg-white/[0.08] ring-1 ring-white/[0.10]">
            <Brain size={15} className="text-white/80" />
          </div>
          <h3 className="text-white font-semibold text-sm">AI Insight</h3>
        </div>
        {data && (
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${scoreColor}`}>
              {data.healthScore}
            </span>
            <span className="text-slate-500 text-xs">/100</span>
          </div>
        )}
      </div>

      {loading ?
        <div className="space-y-2 animate-pulse mb-4">
          <div className="h-3 w-full rounded bg-white/[0.06]" />
          <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
          <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
        </div>
      : topInsight && InsightIcon && cfg ?
        <div
          className={`border-l-2 ${cfg.border} bg-white/[0.035] px-3.5 py-3 mb-4`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <InsightIcon size={12} className={`${cfg.color} flex-shrink-0`} />
            <p className={`text-xs font-semibold ${cfg.color}`}>
              {topInsight.title}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            {topInsight.message}
          </p>
        </div>
      : <div className="border-l-2 border-slate-600 bg-white/[0.035] px-3.5 py-3 mb-4">
          <p className="text-xs leading-relaxed text-slate-400">
            Add transactions to get personalized AI insights about your
            finances.
          </p>
        </div>
      }

      <Link
        href="/dashboard/ai-insights"
        className="primary-action w-full py-2.5 text-xs"
      >
        View Full Insights <ArrowRight size={12} />
      </Link>
    </div>
  );
}
