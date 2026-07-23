import AIConsentGate from "@/components/ai-insights/AIConsentGate";
import AIInsightsOnboarding from "@/components/ai-insights/AIInsightsOnboarding";
import AISettingsPanel from "@/components/ai-insights/AISettingsPanel";
import InsightsPanel from "@/components/ai-insights/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div
      data-ai-insights-page
      className="mx-auto w-full max-w-[1600px] min-w-0 pb-8"
    >
      <AIConsentGate>
        <AIInsightsOnboarding />
        <div className="mb-5 flex min-w-0 justify-end sm:mb-6">
          <AISettingsPanel />
        </div>
        <InsightsPanel />
      </AIConsentGate>
    </div>
  );
}
