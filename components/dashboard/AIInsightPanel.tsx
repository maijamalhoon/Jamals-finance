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
    color: "text-income",
    container: "border-income bg-income-soft",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-payables",
    container: "border-payables bg-payables-soft",
  },
  tip: { icon: Lightbulb, color: "text-info", container: "border-info bg-info-soft" },
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
    !data ? "text-text-muted"
    : data.healthScore >= 80 ? "text-success"
    : data.healthScore >= 60 ? "text-warning"
    : "text-danger";

  return (
    <div className="finance-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="finance-feature-accent flex h-8 w-8 items-center justify-center rounded-[15px] border" data-tone="transfer">
            <Brain size={15} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">AI Insight</h3>
        </div>
        {data && (
          <div className="flex items-center gap-1">
            <span className={`text-sm font-bold ${scoreColor}`}>
              {data.healthScore}
            </span>
            <span className="text-xs text-text-muted">/100</span>
          </div>
        )}
      </div>

      {loading ?
        <div className="space-y-2 animate-pulse mb-4">
          <div className="finance-skeleton h-3 w-full rounded" />
          <div className="finance-skeleton h-3 w-3/4 rounded" />
          <div className="finance-skeleton h-3 w-5/6 rounded" />
        </div>
      : topInsight && InsightIcon && cfg ?
        <div
          className={`mb-4 border-l-2 px-3.5 py-3 ${cfg.container}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <InsightIcon size={12} className={`${cfg.color} flex-shrink-0`} />
            <p className={`text-xs font-semibold ${cfg.color}`}>
              {topInsight.title}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-text-secondary">
            {topInsight.message}
          </p>
        </div>
      : <div className="mb-4 border-l-2 border-border-strong bg-surface-tinted px-3.5 py-3">
          <p className="text-xs leading-relaxed text-text-secondary">
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
