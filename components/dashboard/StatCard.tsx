import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  amount: string;
  usd: string;
  change: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export default function StatCard({
  title,
  amount,
  usd,
  change,
  icon: Icon,
  iconColor,
  iconBg,
}: StatCardProps) {
  const positive = change >= 0;

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4 flex flex-col gap-3 hover:border-gray-700/50 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">{title}</span>
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}
        >
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      <div>
        <p className="text-white font-semibold text-[15px] leading-tight">
          {amount}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-gray-500 text-[11px]">≈ {usd}</span>
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${positive ? "text-green-400" : "text-red-400"}`}
          >
            {positive ?
              <ArrowUpRight size={11} />
            : <ArrowDownRight size={11} />}
            {Math.abs(change)}%
          </span>
        </div>
      </div>
    </div>
  );
}
