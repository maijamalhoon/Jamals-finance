"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "@/components/icons/jalvoro/compat";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
          <div className="jf-node4-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />
          <section role="alert" className="finance-surface relative w-full max-w-md p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-control)] border border-danger/25 bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-sm font-semibold text-danger">Unexpected application error</p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary">This view could not load.</h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              The error was reported. Retry the view; your saved finance records were not changed by this screen.
            </p>
            <Button type="button" onClick={reset} className="mt-6 w-full">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}
