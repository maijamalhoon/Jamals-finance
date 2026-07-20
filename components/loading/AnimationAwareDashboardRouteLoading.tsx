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

function getLoadingClassName(variant: DashboardRouteLoadingVariant) {
  return variant === "dashboard"
    ? "dashboard-overview w-full pb-4"
    : "min-h-8 pb-4";
}

export default async function AnimationAwareDashboardRouteLoading({
  variant = "dashboard",
}: {
  variant?: DashboardRouteLoadingVariant;
}) {
  const animationMode = await getServerAnimationMode();
  const label = getLoadingLabel(variant);

  if (animationMode === "none") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        data-no-animation-route-loading="true"
        className={getLoadingClassName(variant)}
      >
        <span className="text-xs font-semibold text-text-secondary">
          Loading
        </span>
      </div>
    );
  }

  if (animationMode === "fast") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        data-fast-animation-route-loading="true"
        className={getLoadingClassName(variant)}
      >
        <span className="jf-fast-route-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return <DashboardRouteLoading variant={variant} />;
}