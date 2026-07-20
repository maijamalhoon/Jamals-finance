import DashboardRouteLoading from "@/components/loading/DashboardRouteLoading";
import { getServerAnimationMode } from "@/lib/animation-preference-server";

type DashboardRouteLoadingVariant =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "income"
  | "expenses"
  | "goals"
  | "payables"
  | "investments"
  | "analytics"
  | "settings"
  | "ai";

function getLoadingLabel(variant: DashboardRouteLoadingVariant) {
  if (variant === "ai") return "Loading AI insights";
  if (variant === "analytics") return "Loading analytics";
  return `Loading ${variant}`;
}

export default async function AnimationAwareDashboardRouteLoading({
  variant = "dashboard",
}: {
  variant?: DashboardRouteLoadingVariant;
}) {
  const animationMode = await getServerAnimationMode();

  if (animationMode === "none") {
    const label = getLoadingLabel(variant);

    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        data-no-animation-route-loading="true"
        className={
          variant === "dashboard"
            ? "dashboard-overview w-full pb-4"
            : "min-h-8 pb-4"
        }
      >
        <span className="text-xs font-semibold text-text-secondary">
          Loading
        </span>
      </div>
    );
  }

  return <DashboardRouteLoading variant={variant} />;
}
