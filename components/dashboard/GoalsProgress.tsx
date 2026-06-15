import { Home, Shield, Car } from "lucide-react";
import { LucideIcon } from "lucide-react";

const goals: {
  name: string;
  current: number;
  target: number;
  pct: number;
  icon: LucideIcon;
}[] = [
  { name: "New House", current: 2250000, target: 5000000, pct: 45, icon: Home },
  {
    name: "Emergency Fund",
    current: 300000,
    target: 500000,
    pct: 60,
    icon: Shield,
  },
  { name: "New Car", current: 600000, target: 2000000, pct: 30, icon: Car },
];

export default function GoalsProgress() {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">Goals Progress</h3>
        <button className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((g, i) => {
          const Icon = g.icon;
          return (
            <div key={i}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Icon size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-medium">
                      {g.name}
                    </span>
                    <span className="text-yellow-400 text-xs font-semibold">
                      {g.pct}%
                    </span>
                  </div>
                  <p className="text-gray-600 text-[10px] mt-0.5">
                    PKR {g.current.toLocaleString()} /{" "}
                    {g.target.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
