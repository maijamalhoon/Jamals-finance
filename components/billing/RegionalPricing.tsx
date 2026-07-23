"use client";

import Link from "next/link";
import { Check, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";

import {
  SUPPORTED_COUNTRY_CODES,
  formatUsdPrice,
  getAnnualSavingsPercent,
  getPlanPrice,
  getPricingTier,
  PLAN_ORDER,
  PLANS,
  TRIAL_LENGTH_DAYS,
} from "@/lib/billing/catalog";
import type { BillingCycle, PaidPlanKey } from "@/lib/billing/types";

const FEATURE_COPY: Record<string, string> = {
  core_tracking: "Income, expenses, accounts, goals, and investments",
  unlimited_accounts: "Unlimited finance accounts",
  recurring_transactions: "Recurring transaction tools",
  csv_export: "CSV data export",
  advanced_reports: "Advanced reports",
  advanced_analytics: "Advanced analytics",
  ai_insights: "Monthly AI insight allowance",
  forecasting: "Financial forecasting",
  priority_support: "Priority support",
};

export default function RegionalPricing() {
  const [countryCode, setCountryCode] = useState("PK");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const tier = getPricingTier(countryCode);

  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  );
  const countryOptions = useMemo(
    () => SUPPORTED_COUNTRY_CODES
      .map((code) => ({ code, name: countryNames.of(code) ?? code }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [countryNames],
  );
  const countryName = countryNames.of(countryCode) ?? countryCode;

  return (
    <div className="space-y-8">
      <section className="mx-auto grid max-w-4xl gap-4 rounded-3xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
        <label className="grid gap-2 text-sm font-semibold text-text-primary">
          Pricing country
          <select
            value={countryCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setCountryCode(event.target.value)}
            className="min-h-11 rounded-xl border border-border bg-surface-inset px-3 text-sm font-medium outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {countryOptions.map(({ code, name }) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <span className="font-normal text-text-muted">
            {countryName} uses regional tier {tier}. Paddle will show the supported local currency at checkout.
          </span>
        </label>

        <div className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1" aria-label="Billing cycle">
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
      </section>

      <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5" aria-label="Subscription plans">
        {PLAN_ORDER.map((planKey) => {
          const plan = PLANS[planKey];
          const paidPlanKey = planKey === "free" ? null : planKey as PaidPlanKey;
          const price = paidPlanKey
            ? getPlanPrice(paidPlanKey, countryCode, billingCycle)
            : 0;
          const savings = paidPlanKey
            ? getAnnualSavingsPercent(paidPlanKey, countryCode)
            : 0;

          return (
            <article
              key={plan.key}
              className={`relative flex min-h-full flex-col rounded-3xl border bg-surface p-5 shadow-soft ${
                plan.recommended ? "border-primary shadow-premium" : "border-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Best value
                </span>
              ) : null}

              <div className="mb-5">
                <div className="mb-3 flex items-center gap-2">
                  {plan.studentOnly ? <GraduationCap className="size-5 text-investment" aria-hidden="true" /> : null}
                  {plan.key === "pro" ? <Sparkles className="size-5 text-primary" aria-hidden="true" /> : null}
                  {plan.key === "free" ? <ShieldCheck className="size-5 text-success" aria-hidden="true" /> : null}
                  <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                </div>
                <p className="min-h-16 text-sm leading-6 text-text-muted">{plan.description}</p>
              </div>

              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <strong className="text-3xl font-extrabold tracking-tight text-text-primary">
                    {formatUsdPrice(price)}
                  </strong>
                  <span className="pb-1 text-sm text-text-muted">
                    /{billingCycle === "annual" ? "year" : "month"}
                  </span>
                </div>
                {billingCycle === "annual" && paidPlanKey ? (
                  <p className="mt-1 text-xs font-semibold text-success">Save about {savings}% annually</p>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">Taxes shown before payment</p>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-text-secondary">
                {Object.entries(plan.features)
                  .filter(([, allowance]) => allowance === true || (typeof allowance === "number" && allowance > 0))
                  .map(([feature, allowance]) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      <span>
                        {FEATURE_COPY[feature] ?? feature}
                        {typeof allowance === "number" ? ` (${allowance}/month)` : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              <Link
                href={planKey === "free" ? "/login?mode=signup" : "/login?mode=signup&intent=upgrade"}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition focus-visible:shadow-[var(--focus-ring)] ${
                  plan.recommended
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                    : "border border-border bg-surface-inset text-text-primary hover:border-border-strong"
                }`}
              >
                {planKey === "free" ? "Start free" : planKey === "pro" ? `Try Pro for ${TRIAL_LENGTH_DAYS} days` : `Choose ${plan.name}`}
              </Link>
            </article>
          );
        })}
      </section>

      <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-text-muted">
        The free trial requires no card and never charges automatically. Student pricing requires verification and renews yearly. Taxes and the final supported local currency are shown before payment.
      </p>
    </div>
  );
}
