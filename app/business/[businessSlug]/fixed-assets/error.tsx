"use client";

import { CircleAlert, RotateCcw } from "@/components/icons/jalvoro/compat";

import { Button } from "@/components/ui/button";

export default function FixedAssetsError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-background px-4 py-8">
      <section className="w-full max-w-lg rounded-[var(--radius-card)] bg-surface px-6 py-8 text-center shadow-[var(--shadow-md)]">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <CircleAlert aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-black text-text-primary">Fixed assets could not be loaded</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          No journal was changed. Retry after checking the business connection and access permissions.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw aria-hidden="true" /> Retry
        </Button>
      </section>
    </main>
  );
}
