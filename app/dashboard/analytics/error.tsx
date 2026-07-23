"use client";

import { AlertTriangle, RefreshCw } from "@/components/icons/jalvoro/compat";

import { Button } from "@/components/ui/button";

export default function AnalyticsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="finance-panel grid min-h-[26rem] place-items-center p-6 text-center">
      <div className="max-w-md">
        <AlertTriangle aria-hidden="true" className="mx-auto size-8 text-danger" />
        <h2 className="mt-4 text-xl font-bold text-text-primary">Analytics could not open</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Your financial records were not changed. Try loading the protected analytics page again.</p>
        <Button className="mt-5" onClick={reset}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
