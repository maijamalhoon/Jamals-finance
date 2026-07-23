"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "@/components/icons/jalvoro/compat";

import { Button } from "@/components/ui/button";

export default function BusinessFxError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-[var(--radius-card)] bg-surface px-6 py-8 text-center shadow-[var(--shadow-sm)]">
        <AlertTriangle aria-hidden="true" className="mx-auto size-9 text-warning" />
        <h1 className="mt-4 text-xl font-black text-text-primary">Foreign exchange workspace could not load</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          No rate, settlement, or accounting data was changed. Retry the protected snapshot or return to business workspaces.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Retry
          </Button>
          <Link className="finance-focus inline-flex min-h-10 items-center rounded-[var(--radius-button)] px-4 text-sm font-bold text-primary" href="/business">
            Business workspaces
          </Link>
        </div>
      </section>
    </main>
  );
}
