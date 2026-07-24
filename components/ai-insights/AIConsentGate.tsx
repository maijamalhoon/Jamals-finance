"use client";

import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { BrainCircuit, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const AI_CONSENT_KEY = "jamals-finance-ai-summary-consent-v1";

export default function AIConsentGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(AI_CONSENT_KEY) === "accepted");
    setReady(true);
  }, []);

  function enable() {
    window.localStorage.setItem(AI_CONSENT_KEY, "accepted");
    setEnabled(true);
  }

  function disable() {
    window.localStorage.removeItem(AI_CONSENT_KEY);
    setEnabled(false);
  }

  if (!ready) {
    return (
      <div className="mx-auto grid min-h-[55vh] w-full max-w-3xl place-items-center px-4">
        <div className="h-24 w-full animate-pulse rounded-[24px] bg-skeleton" aria-label="Loading AI privacy choice" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-1 py-8 sm:px-4">
        <div className="w-full rounded-[28px] bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7 lg:p-9">
          <span className="grid size-12 place-items-center rounded-[18px] bg-active/10 text-active">
            <BrainCircuit size={24} aria-hidden="true" />
          </span>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-active">
            AI privacy choice
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Choose before using external AI
          </h1>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            {APP_NAME} first tries local, deterministic calculations. When a question or briefing needs Gemini and the provider is configured, the Service may send your question plus a summarized finance context to Google Gemini.
          </p>

          <div className="mt-5 rounded-[20px] bg-surface-secondary px-4 py-4 text-sm leading-6 text-text-secondary sm:px-5">
            <p className="font-semibold text-text-primary">The summary can include:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-active">
              <li>income, expense, cash-flow, and estimated net-position totals;</li>
              <li>category names and summarized category spending;</li>
              <li>goal, investment, payable, and recent-trend totals;</li>
              <li>the finance question you submit.</li>
            </ul>
            <p className="mt-3">
              The application prompt does not include your password, authentication token, or online-banking credentials.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-[18px] bg-info/10 px-4 py-3.5 text-sm leading-6 text-text-secondary">
            <ShieldCheck className="mt-0.5 shrink-0 text-info" size={17} aria-hidden="true" />
            <p>
              AI output can be wrong and is not financial, tax, legal, accounting, or investment advice. You can disable this choice from this page at any time.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enable}
              className="finance-focus primary-action min-h-12 flex-1 rounded-[18px] px-5 text-sm font-semibold"
            >
              Enable AI insights
            </button>
            <Link
              href="/dashboard"
              className="finance-focus inline-flex min-h-12 flex-1 items-center justify-center rounded-[18px] bg-surface-secondary px-5 text-sm font-semibold text-text-primary hover:bg-hover"
            >
              Not now
            </Link>
          </div>

          <p className="mt-5 text-xs leading-5 text-text-tertiary">
            Read the{" "}
            <Link className="finance-focus font-semibold text-active" href="/privacy#ai">
              Privacy Notice
            </Link>{" "}
            and{" "}
            <Link className="finance-focus font-semibold text-active" href="/disclosures#ai">
              AI disclosures
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 flex min-w-0 items-start justify-between gap-3 rounded-[18px] bg-info/10 px-4 py-3 text-xs leading-5 text-text-secondary sm:items-center">
        <p className="min-w-0">
          External AI sharing is enabled for summarized finance context. Local deterministic answers are used whenever available.
        </p>
        <button
          type="button"
          onClick={disable}
          className="finance-focus inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-background/70 px-3 font-semibold text-text-primary hover:bg-hover"
          aria-label="Disable external AI sharing"
        >
          <X size={14} aria-hidden="true" />
          Disable
        </button>
      </div>
      {children}
    </div>
  );
}
