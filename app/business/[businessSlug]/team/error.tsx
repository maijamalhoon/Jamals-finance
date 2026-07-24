"use client";

import Link from "next/link";
import { RotateCcw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BusinessTeamError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-lg rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center shadow-[var(--shadow-sm)] sm:px-8">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-[var(--radius-button)] bg-danger-soft text-danger">
          <ShieldAlert className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-primary">Team workspace unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          The team screen could not be rendered. No invitation, permission, membership, or ownership record was changed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
          <Link
            href="/business"
            className="finance-focus inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-secondary px-4 text-sm font-semibold text-secondary-foreground shadow-[var(--shadow-xs)] transition-colors hover:bg-secondary-hover"
          >
            Business workspaces
          </Link>
        </div>
      </section>
    </main>
  );
}
