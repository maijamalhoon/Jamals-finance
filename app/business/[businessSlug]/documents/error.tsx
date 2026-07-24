"use client";

import { FileWarning, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessDocumentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-[var(--radius-card)] bg-surface px-6 py-8 text-center shadow-[var(--shadow-sm)]">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-[var(--radius-button)] bg-warning-soft text-warning">
          <FileWarning className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-black text-text-primary">Documents could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">Private files and metadata were not changed. Retry the secure workspace request.</p>
        <Button className="mt-6" onClick={reset}><RefreshCcw aria-hidden="true" /> Retry</Button>
      </section>
    </main>
  );
}
