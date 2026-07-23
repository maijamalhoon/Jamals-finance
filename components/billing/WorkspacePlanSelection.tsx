"use client";

import { Building2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { BusinessPlanGrid } from "@/components/billing/RegionalPricing";
import type { BillingCycle } from "@/lib/billing/types";

type WorkspacePlanSelectionProps = {
  businessId: string;
  businessName: string;
  businessSystemName: string;
  countryCode: string;
  freeHref: string;
};

export default function WorkspacePlanSelection({
  businessId,
  businessName,
  businessSystemName,
  countryCode,
  freeHref,
}: WorkspacePlanSelectionProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <Building2 className="size-4" aria-hidden="true" />
              {businessSystemName}
            </span>
            <h1 className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
              Choose the plan for {businessName}.
            </h1>
            <p className="mt-3 text-sm leading-6 text-text-muted sm:text-base">
              The company name, selected system, team, permissions, subscription,
              and invoice remain scoped to this workspace. Continue Free is
              always available.
            </p>
          </div>

          <div
            className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1"
            aria-label="Billing cycle"
          >
            {(["monthly", "annual"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                aria-pressed={billingCycle === cycle}
                className={`min-h-10 rounded-lg px-4 text-sm font-semibold capitalize transition ${
                  billingCycle === cycle
                    ? "bg-primary text-primary-foreground shadow-theme"
                    : "text-text-secondary hover:bg-surface"
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-surface-inset p-4 text-sm text-text-secondary sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
            Business data is isolated from personal finance
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            No AI entitlement or AI processing for business data
          </span>
        </div>
      </section>

      <BusinessPlanGrid
        countryCode={countryCode}
        billingCycle={billingCycle}
        businessId={businessId}
        freeHref={freeHref}
      />

      <p className="mx-auto max-w-4xl text-center text-sm leading-6 text-text-muted">
        Paid checkout will use the verified billing country and provider-hosted
        payment screen. Card details will never be stored by JALVORO.
      </p>
    </div>
  );
}
