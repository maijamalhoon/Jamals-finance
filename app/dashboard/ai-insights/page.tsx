import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">AI Insights</h2>
          <p className="page-subtitle">
            Powered by Claude, based on your latest transactions
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <InsightsPanel />
      </div>
    </div>
  );
}
