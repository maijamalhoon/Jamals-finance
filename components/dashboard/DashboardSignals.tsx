import {
  Activity,
  CalendarCheck,
  Flame,
  LucideIcon,
  Trophy,
} from "lucide-react";

interface Signal {
  title: string;
  value: string;
  detail: string;
  progress: number;
  tone: "cyan" | "green" | "red" | "amber";
  icon: LucideIcon;
}

const toneClasses = {
  cyan: {
    icon: "bg-cyan-500/15 text-cyan-300",
    bar: "bg-cyan-300",
  },
  green: {
    icon: "bg-green-500/15 text-green-300",
    bar: "bg-green-300",
  },
  red: {
    icon: "bg-red-500/15 text-red-300",
    bar: "bg-red-300",
  },
  amber: {
    icon: "bg-amber-500/15 text-amber-300",
    bar: "bg-amber-300",
  },
};

function clampProgress(value: number) {
  return Math.min(100, Math.max(6, value));
}

export default function DashboardSignals({
  savingsRate,
  dailySpend,
  activeDays,
  daysInMonth,
  topCategory,
}: {
  savingsRate: number;
  dailySpend: string;
  activeDays: number;
  daysInMonth: number;
  topCategory: { name: string; amount: string } | null;
}) {
  const savingsPositive = savingsRate >= 0;
  const signals: Signal[] = [
    {
      title: "Savings Rate",
      value: `${Math.round(savingsRate)}%`,
      detail: savingsPositive ? "Income retained" : "Overspent this month",
      progress: savingsPositive ? savingsRate : Math.abs(savingsRate),
      tone: savingsPositive ? "green" : "red",
      icon: Activity,
    },
    {
      title: "Daily Spend",
      value: dailySpend,
      detail: "Month-to-date average",
      progress: 62,
      tone: "amber",
      icon: Flame,
    },
    {
      title: "Active Days",
      value: `${activeDays}/${daysInMonth}`,
      detail: "Days with activity",
      progress: (activeDays / daysInMonth) * 100,
      tone: "cyan",
      icon: CalendarCheck,
    },
    {
      title: "Top Category",
      value: topCategory?.name ?? "No spend",
      detail: topCategory ? topCategory.amount : "No expenses recorded",
      progress: topCategory ? 78 : 6,
      tone: "red",
      icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {signals.map(({ title, value, detail, progress, tone, icon: Icon }) => {
        const colors = toneClasses[tone];

        return (
          <div
            key={title}
            className="finance-panel card-hover flex min-h-[112px] flex-col justify-between gap-4 p-4 hover:border-white/[0.14]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{title}</p>
                <p className="mt-1 truncate text-base font-semibold text-white">
                  {value}
                </p>
              </div>
              <div
                className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ring-1 ring-white/[0.06] ${colors.icon}`}
              >
                <Icon size={16} />
              </div>
            </div>

            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: `${clampProgress(progress)}%` }}
                />
              </div>
              <p className="mt-2 truncate text-[11px] text-slate-500">
                {detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
