"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessPayrollError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-[var(--radius-card)] bg-surface px-6 py-8 text-center shadow-[var(--shadow-sm)]">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <CircleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-black text-text-primary">Payroll could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          No payroll transaction was changed. Retry the protected payroll snapshot.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RefreshCw aria-hidden="true" /> Retry
        </Button>
      </section>
    </main>
  );
}
