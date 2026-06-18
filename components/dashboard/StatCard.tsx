import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  amount: string;
  usd: string;
  change: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  detail?: string;
  progress?: number;
  href?: string;
}

export default function StatCard({
  title,
  amount,
  usd,
  change,
  icon: Icon,
  iconColor,
  iconBg,
  detail,
  progress,
  href,
}: StatCardProps) {
  const positive = change >= 0;
  const normalizedProgress =
    typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  const content = (
    <div className="finance-panel card-hover widget-link flex min-h-[176px] flex-col justify-between gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-400 text-xs font-medium">{title}</span>
        <div
          className={`w-10 h-10 rounded-3xl ${iconBg} flex items-center justify-center ring-1 ring-white/[0.06]`}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <div>
        <p className="break-words text-xl font-bold leading-tight tracking-normal text-white">
          {amount}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-slate-500 text-[11px]">approx. {usd}</span>
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${positive ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}
          >
            {positive ?
              <ArrowUpRight size={11} />
            : <ArrowDownRight size={11} />}
            {Math.abs(change)}%
          </span>
        </div>
        {detail && (
          <p className="mt-3 min-h-8 text-[11px] leading-4 text-slate-500">
            {detail}
          </p>
        )}
        {normalizedProgress !== null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-cyan-300"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        )}
        <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-cyan-200/80">
          Open detail
          <ArrowUpRight size={12} />
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
