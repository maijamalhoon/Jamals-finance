import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
      <header className="min-w-0 px-0.5">
        <h1 className="text-base font-semibold tracking-tight text-text-primary sm:text-lg">
          AI Insights
        </h1>
      </header>

      <div className="min-w-0">
        <InsightsPanel />
      </div>
    </div>
  );
}
