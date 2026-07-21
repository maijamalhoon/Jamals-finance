import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div
      data-ai-insights-page
      className="mx-auto w-full max-w-[1600px] min-w-0 pb-8"
    >
      <InsightsPanel />
    </div>
  );
}
