"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessInventoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center shadow-[var(--shadow-sm)] sm:px-7">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-warning-soft text-warning">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black text-text-primary">Inventory could not be loaded</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            No stock movement or accounting entry was changed. Retry the tenant-scoped inventory workspace.
          </p>
          <Button type="button" className="mt-5" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Retry inventory
          </Button>
        </div>
      </section>
    </main>
  );
}
