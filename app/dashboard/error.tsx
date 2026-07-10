"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[min(560px,72dvh)] items-center justify-center px-2 py-10 sm:px-4">
      <section
        role="alert"
        aria-live="assertive"
        className="finance-panel flex w-full max-w-lg flex-col items-center px-6 py-8 text-center sm:px-8 sm:py-10"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-warning/25 bg-warning/10 text-warning shadow-theme">
          <AlertTriangle size={25} aria-hidden="true" />
        </div>

        <div className="mt-5 max-w-sm">
          <p className="text-lg font-bold tracking-[-0.02em] text-text-primary">
            This page could not load
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            The workspace hit a temporary connection problem. Your saved finance data was not changed.
          </p>
          {error.digest ? (
            <p className="mt-3 text-xs font-medium text-text-tertiary">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>

        <Button onClick={reset} className="mt-6 min-w-32">
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
      </section>
    </div>
  );
}
