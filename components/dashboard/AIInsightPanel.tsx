import { Brain } from "lucide-react";

export default function AIInsightPanel() {
  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
          <Brain size={15} className="text-indigo-400" />
        </div>
        <h3 className="text-white font-medium text-sm">AI Financial Insight</h3>
      </div>

      <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-xl p-3.5 mb-4">
        <p className="text-gray-300 text-xs leading-relaxed">
          Your{" "}
          <span className="text-white font-medium">
            transportation expenses
          </span>{" "}
          are 20% higher this month than last month.
        </p>
        <p className="text-gray-500 text-xs mt-2 leading-relaxed">
          Try optimizing your travel costs to save more.
        </p>
      </div>

      <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
        View Details
      </button>
    </div>
  );
}
