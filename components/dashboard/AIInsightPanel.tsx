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
    color: "text-emerald-600",
    border: "border-emerald-500",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    border: "border-amber-500",
  },
  tip: { icon: Lightbulb, color: "text-blue-600", border: "border-blue-500" },
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
    !data ? "text-slate-500"
    : data.healthScore >= 80 ? "text-emerald-600"
    : data.healthScore >= 60 ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="finance-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[15px] bg-blue-50 ring-1 ring-blue-100">
            <Brain size={15} className="text-blue-600" />
          </div>
          <h3 className="text-slate-950 font-semibold text-sm">AI Insight</h3>
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
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
        </div>
      : topInsight && InsightIcon && cfg ?
        <div
          className={`border-l-2 ${cfg.border} bg-slate-50 px-3.5 py-3 mb-4`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <InsightIcon size={12} className={`${cfg.color} flex-shrink-0`} />
            <p className={`text-xs font-semibold ${cfg.color}`}>
              {topInsight.title}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">
            {topInsight.message}
          </p>
        </div>
      : <div className="border-l-2 border-slate-300 bg-slate-50 px-3.5 py-3 mb-4">
          <p className="text-xs leading-relaxed text-slate-600">
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
