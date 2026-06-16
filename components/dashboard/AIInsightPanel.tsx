import { Brain } from "lucide-react";

export default function AIInsightPanel() {
  return (
    <div className="finance-panel p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center ring-1 ring-indigo-400/20">
          <Brain size={15} className="text-indigo-300" />
        </div>
        <h3 className="text-white font-semibold text-sm">
          AI Financial Insight
        </h3>
      </div>

      <div className="border-l-2 border-cyan-300 bg-white/[0.035] px-3.5 py-3 mb-4">
        <p className="text-gray-300 text-xs leading-relaxed">
          Your{" "}
          <span className="text-white font-medium">
            transportation expenses
          </span>{" "}
          are 20% higher this month than last month.
        </p>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          Try optimizing your travel costs to save more.
        </p>
      </div>

      <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-950/25">
        View Details
      </button>
    </div>
  );
}
