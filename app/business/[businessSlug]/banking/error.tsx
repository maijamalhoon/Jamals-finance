"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessBankingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-[var(--radius-card)] bg-surface px-6 py-7 text-center shadow-[var(--shadow-sm)]">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-black text-text-primary">Banking data is temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          No statement, match, ledger, or reconciliation record was changed. Retry the secure workspace request.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RefreshCcw aria-hidden="true" /> Retry
        </Button>
      </section>
    </main>
  );
}
