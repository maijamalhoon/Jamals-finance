"use client";

import { AlertCircle, RefreshCw } from "@/components/icons/jalvoro/compat";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="motion-error-shake flex min-h-[min(520px,70dvh)] items-center justify-center px-2 py-8 sm:px-4">
      <div
        role="alert"
        aria-live="assertive"
        className="finance-panel flex w-full max-w-md flex-col items-center gap-4 px-5 py-7 text-center sm:p-7"
      >
        <div className="finance-status-danger flex h-12 w-12 items-center justify-center rounded-[18px] border">
          <AlertCircle size={23} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Dashboard could not load
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            The overview is temporarily unavailable. Check your connection, then try loading it again.
          </p>
        </div>
        <Button type="button" onClick={reset}>
          <RefreshCw size={14} />
          Try again
        </Button>
      </div>
    </div>
  );
}
