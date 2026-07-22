"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessTaxClosingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[var(--shadow-sm)]">
        <h1 className="text-xl font-black text-text-primary">Tax controls are temporarily unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          No accounting or tax records were changed. Try loading the workspace again.
        </p>
        <Button type="button" onClick={reset} className="mt-5">
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}
