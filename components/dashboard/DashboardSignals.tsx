"use client";

import { motion } from "framer-motion";
import { Activity, CalendarCheck, Flame } from "lucide-react";
import {
  motionEase,
} from "@/components/motion/animation-config";
import { scaleAnimationSeconds } from "@/lib/animation-preference";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function Sparkline({ values }: { values: number[] }) {
  const width = 180;
  const height = 58;
  const max = Math.max(...values, 1);
  const points =
    values.length > 1
      ? values.map((value, index) => {
          const x = (index / (values.length - 1)) * width;
          const y = height - (value / max) * (height - 8) - 4;
          return [x, y] as const;
        })
      : [[0, height - 4] as const, [width, height - 4] as const];

  const path = points
    .map(([x, y], index) => {
      if (index === 0) return `M ${x} ${y}`;
      const [prevX, prevY] = points[index - 1];
      const midX = (prevX + x) / 2;
      return `C ${midX} ${prevY}, ${midX} ${y}, ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
      <defs>
        <linearGradient id="dailySpendSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--payables)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--payables)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#dailySpendSpark)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: scaleAnimationSeconds(0.18),
          ease: motionEase,
        }}
      />
      <motion.path
        d={path}
        fill="none"
        initial={{ pathLength: 0, opacity: 0.65 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: scaleAnimationSeconds(0.2),
          ease: motionEase,
        }}
        stroke="var(--payables)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function Donut({ value }: { value: number }) {
  const progress = clamp(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const positive = value >= 0;

  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 112 112" className="-rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="12"
        />
        <motion.circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={positive ? "var(--income)" : "var(--expense)"}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: scaleAnimationSeconds(0.2),
            ease: motionEase,
          }}
          strokeLinecap="round"
          strokeWidth="12"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-bold text-text-primary">{Math.round(value)}%</p>
          <p className="text-[10px] font-medium text-text-muted">saved</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSignals({
  savingsRate,
  dailySpend,
  dailyExpenseTrend,
  activeDayNumbers,
  daysInMonth,
}: {
  savingsRate: number;
  dailySpend: string;
  dailyExpenseTrend: number[];
  activeDayNumbers: number[];
  daysInMonth: number;
}) {
  const activeSet = new Set(activeDayNumbers);
  const savingsPositive = savingsRate >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="finance-panel card-hover flex min-h-[190px] items-center justify-between gap-5 p-5 hover:border-border-strong">
        <div>
          <div className="finance-feature-accent grid h-10 w-10 place-items-center rounded-[18px] border" data-tone="income">
            <Activity size={17} />
          </div>
          <p className="mt-4 text-sm font-semibold text-text-primary">Savings Rate</p>
          <p className="mt-1 max-w-[13rem] text-xs leading-5 text-text-muted">
            {savingsPositive ? "Income retained this month" : "Overspent this month"}
          </p>
        </div>
        <Donut value={savingsRate} />
      </div>

      <div className="finance-panel card-hover min-h-[190px] p-5 hover:border-border-strong">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Daily Spend</p>
            <p className="mt-1 text-xs text-text-muted">
              Month-to-date wave graph
            </p>
          </div>
          <div className="finance-feature-accent grid h-10 w-10 place-items-center rounded-[18px] border" data-tone="payables">
            <Flame size={17} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-text-primary">{dailySpend}</p>
          <Sparkline values={dailyExpenseTrend} />
        </div>
      </div>

      <div className="finance-panel card-hover min-h-[190px] p-5 hover:border-border-strong">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Active Days</p>
            <p className="mt-1 text-xs text-text-muted">
              {activeDayNumbers.length}/{daysInMonth} days with activity
            </p>
          </div>
          <div className="finance-feature-accent grid h-10 w-10 place-items-center rounded-[18px] border" data-tone="transfer">
            <CalendarCheck size={17} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const active = activeSet.has(day);
            return (
              <motion.span
                key={day}
                title={`Day ${day}`}
                initial={{ opacity: 0, scale: 0.84 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: scaleAnimationSeconds(0.16),
                  delay: scaleAnimationSeconds(Math.min(index * 0.006, 0.12)),
                  ease: motionEase,
                }}
                className={`aspect-square rounded-[9px] ${
                  active
                    ? "bg-transfer shadow-[var(--shadow-xs)]"
                    : "bg-surface-tinted"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
