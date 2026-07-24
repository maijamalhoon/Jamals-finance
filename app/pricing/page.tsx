import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2, LockKeyhole } from "lucide-react";
import { headers } from "next/headers";

import RegionalPricing from "@/components/billing/RegionalPricing";

export const metadata: Metadata = {
  title: "Regional pricing",
  description:
    "Affordable regional plans for personal finance, businesses, and enterprise groups in Jamal's Finance.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const requestHeaders = await headers();
  const countryCode = requestHeaders.get("x-vercel-ip-country");

  return (
    <main className="min-h-screen bg-background px-[var(--space-page)] py-8 sm:py-12">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-text-secondary hover:bg-surface focus-visible:shadow-[var(--focus-ring)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-4" aria-hidden="true" />
              Regional pricing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Secure provider checkout
            </span>
          </div>
        </header>

        <section className="mx-auto mb-10 max-w-5xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-primary">
            One account. Two universes.
          </p>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-text-primary sm:text-6xl">
            Personal clarity and business scale—without mixing the data.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-7 text-text-muted sm:text-lg">
            Use one JALVORO identity for personal finance, independent
            companies, and enterprise groups. Every business keeps its own
            subscription, team, modules, and invoice.
          </p>
        </section>

        <RegionalPricing initialCountryCode={countryCode} />
      </div>
    </main>
  );
}
