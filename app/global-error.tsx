"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
        <main className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-soft">
            <p className="text-sm font-medium text-danger">Something went wrong</p>
            <h1 className="mt-3 text-2xl font-semibold text-text-primary">
              We could not load this view.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              The error has been reported. You can try loading the dashboard
              again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 min-h-11 rounded-lg bg-active px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
