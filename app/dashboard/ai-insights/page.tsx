import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div className="space-y-5">
      <div className="page-heading finance-surface-glass overflow-hidden">
        <div className="min-w-0">
          <h2 className="page-title">AI Insights</h2>
          <p className="page-subtitle">
            Powered by Gemini, based on your summarized finance data
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <InsightsPanel />
      </div>
    </div>
  );
}
