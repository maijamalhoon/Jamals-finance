import InsightsPanel from "@/components/ai-insights/InsightsPanel";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AIInsightsPage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex min-w-0 items-start gap-3 px-1 py-1 sm:items-center sm:gap-4 sm:py-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-active/10 text-active sm:h-11 sm:w-11">
          <Sparkles size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="page-title">AI Insights</h2>
          <p className="page-subtitle">
            Clear guidance from your latest financial activity, powered by
            Gemini.
          </p>
        </div>
      </header>

      <div className="min-w-0">
        <InsightsPanel />
      </div>
    </div>
  );
}
