"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

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
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
      <defs>
        <linearGradient id="spendRecordWave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#spendRecordWave)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={path}
        fill="none"
        initial={{ pathLength: 0, opacity: 0.7 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export default function SpendRecordWidget({
  dailySpend,
  dailyExpenseTrend,
}: {
  dailySpend: string;
  dailyExpenseTrend: number[];
}) {
  return (
    <div className="finance-panel card-hover flex h-full min-h-[260px] flex-col p-5 hover:border-blue-200">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-500">
          <Activity size={12} />
          Spend Record
        </div>
        <h3 className="mt-1 text-base font-semibold text-slate-950">
          Month-to-Date
        </h3>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-amber-500">{dailySpend}</p>
        <p className="mt-1 text-[11px] font-medium tracking-[0.12em] text-slate-500">
          daily average
        </p>
      </div>

      <div className="mt-auto pt-5">
        <Sparkline values={dailyExpenseTrend} />
      </div>
    </div>
  );
}
