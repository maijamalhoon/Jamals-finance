"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="motion-error-shake flex min-h-[360px] items-center justify-center px-4">
      <div
        role="alert"
        aria-live="assertive"
        className="finance-panel flex w-full max-w-md flex-col items-center gap-4 p-6 text-center"
      >
        <div className="finance-status-danger flex h-12 w-12 items-center justify-center rounded-[18px] border">
          <AlertCircle size={23} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Dashboard could not load
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {error.message || "Refresh the workspace and try again."}
          </p>
        </div>
        <button onClick={reset} className="primary-action">
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}
