import { getServerAnimationMode } from "@/lib/animation-preference-server";

export default async function AnalyticsLoading() {
  const animationMode = await getServerAnimationMode();

  if (animationMode === "none") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading analytics"
        data-no-animation-route-loading="true"
        className="min-h-8 pb-4"
      >
        <span className="text-xs font-semibold text-text-secondary">Loading</span>
      </div>
    );
  }

  if (animationMode === "fast") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading analytics"
        data-fast-animation-route-loading="true"
        className="min-h-8 pb-4"
      >
        <span className="jf-fast-route-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">Loading analytics</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading analytics"
      data-standard-animation-route-loading="true"
      className="min-h-8 pb-4"
    >
      <span className="jf-standard-route-loader" aria-hidden="true">
        <span />
      </span>
      <span className="sr-only">Loading analytics</span>
    </div>
  );
}
