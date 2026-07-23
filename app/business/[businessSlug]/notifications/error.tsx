"use client";

import Link from "next/link";
import { BellOff, RotateCcw } from "@/components/icons/jalvoro/compat";

import { Button } from "@/components/ui/button";

export default function BusinessNotificationsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-lg rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center shadow-[var(--shadow-sm)] sm:px-8">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <BellOff className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-primary">
          Notification center unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          The alert screen could not be rendered. No invoice, payment, stock, CRM, team, preference, or accounting record was changed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
          <Link
            href="/business"
            className="finance-focus inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary-hover"
          >
            Business workspaces
          </Link>
        </div>
      </section>
    </main>
  );
}
