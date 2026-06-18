import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-xl font-semibold">AI Insights</h2>
        <p className="text-gray-500 text-sm mt-1">
          Powered by Claude — based on your latest transactions
        </p>
      </div>

      <div className="max-w-lg">
        <InsightsPanel />
      </div>
    </div>
  );
}
