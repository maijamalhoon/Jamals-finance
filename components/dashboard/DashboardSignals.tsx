import { Activity, CalendarCheck, Flame } from "lucide-react";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function Sparkline({ values }: { values: number[] }) {
  const width = 180;
  const height = 58;
  const max = Math.max(...values, 1);
  const points =
    values.length > 1 ?
      values.map((value, index) => {
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
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#dailySpendSpark)" />
      <path
        d={path}
        fill="none"
        stroke="#fbbf24"
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
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="12"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          fill="none"
          stroke={positive ? "#86efac" : "#fda4af"}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="12"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-bold text-white">{Math.round(value)}%</p>
          <p className="text-[10px] font-medium text-slate-500">saved</p>
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
      <div className="finance-panel card-hover flex min-h-[190px] items-center justify-between gap-5 p-5 hover:border-white/[0.14]">
        <div>
          <div className="grid h-10 w-10 place-items-center rounded-3xl bg-emerald-300/15 text-emerald-200 ring-1 ring-emerald-200/15">
            <Activity size={17} />
          </div>
          <p className="mt-4 text-sm font-semibold text-white">Savings Rate</p>
          <p className="mt-1 max-w-[13rem] text-xs leading-5 text-slate-500">
            {savingsPositive ? "Income retained this month" : "Overspent this month"}
          </p>
        </div>
        <Donut value={savingsRate} />
      </div>

      <div className="finance-panel card-hover min-h-[190px] p-5 hover:border-white/[0.14]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Daily Spend</p>
            <p className="mt-1 text-xs text-slate-500">
              Month-to-date wave graph
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-3xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/15">
            <Flame size={17} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-white">{dailySpend}</p>
          <Sparkline values={dailyExpenseTrend} />
        </div>
      </div>

      <div className="finance-panel card-hover min-h-[190px] p-5 hover:border-white/[0.14]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Active Days</p>
            <p className="mt-1 text-xs text-slate-500">
              {activeDayNumbers.length}/{daysInMonth} days with activity
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-3xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-200/15">
            <CalendarCheck size={17} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const active = activeSet.has(day);
            return (
              <span
                key={day}
                title={`Day ${day}`}
                className={`aspect-square rounded-[9px] ${
                  active ?
                    "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.24)]"
                  : "bg-white/[0.055]"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
