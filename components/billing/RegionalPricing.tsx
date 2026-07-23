"use client";

import Link from "next/link";
import {
  Building2,
  Check,
  GraduationCap,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import {
  BUSINESS_MODULES,
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_TRIAL_LENGTH_DAYS,
  getBusinessAnnualSavingsPercent,
  getBusinessPlanPrice,
} from "@/lib/billing/business-catalog";
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
import type {
  BillingCycle,
  BusinessPlanKey,
  PaidPlanKey,
  PricedBusinessPlanKey,
} from "@/lib/billing/types";

const PERSONAL_FEATURE_COPY: Record<string, string> = {
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

const BUSINESS_FEATURE_COPY: Record<string, string> = {
  business_core: "Core business finance and operations",
  invoicing: "Invoices and sales records",
  expenses: "Business expenses and purchases",
  contacts: "Customers and suppliers",
  basic_reports: "Essential business reports",
  advanced_reports: "Advanced reporting",
  inventory_ready: "Inventory module ready",
  crm_ready: "CRM module ready",
  branch_management: "Multiple branches",
  department_controls: "Departments and operating controls",
  approval_workflows: "Approval workflows",
  audit_log: "Audit history",
  api_access: "API access",
  consolidated_reporting: "Group-level consolidated reporting",
  priority_support: "Priority support",
  ai_insights: "Monthly business AI allowance",
};

const SUPPORTED_COUNTRIES = new Set<string>(SUPPORTED_COUNTRY_CODES);

function normalizeCountryCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && SUPPORTED_COUNTRIES.has(normalized) ? normalized : null;
}

function detectBrowserCountry(): string | null {
  if (typeof navigator === "undefined") return null;

  for (const locale of navigator.languages) {
    try {
      const region = normalizeCountryCode(new Intl.Locale(locale).region);
      if (region) return region;
    } catch {
      // Continue through the browser's remaining locale preferences.
    }
  }

  return null;
}

type RegionalPricingProps = {
  initialCountryCode?: string | null;
};

function PricingButton({
  href,
  featured,
  children,
}: {
  href: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition focus-visible:shadow-[var(--focus-ring)] ${
        featured
          ? "bg-primary text-primary-foreground hover:bg-primary-hover"
          : "border border-border bg-surface-inset text-text-primary hover:border-border-strong"
      }`}
    >
      {children}
    </Link>
  );
}

function PersonalPlanCards({
  countryCode,
  billingCycle,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
}) {
  return (
    <>
      <section
        className="grid gap-4 lg:grid-cols-3 xl:grid-cols-5"
        aria-label="Personal subscription plans"
      >
        {PLAN_ORDER.map((planKey) => {
          const plan = PLANS[planKey];
          const paidPlanKey =
            planKey === "free" ? null : (planKey as PaidPlanKey);
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
                plan.recommended
                  ? "border-primary shadow-premium"
                  : "border-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Best value
                </span>
              ) : null}

              <div className="mb-5">
                <div className="mb-3 flex items-center gap-2">
                  {plan.studentOnly ? (
                    <GraduationCap
                      className="size-5 text-investment"
                      aria-hidden="true"
                    />
                  ) : null}
                  {plan.key === "pro" ? (
                    <Sparkles
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                  {plan.key === "free" ? (
                    <ShieldCheck
                      className="size-5 text-success"
                      aria-hidden="true"
                    />
                  ) : null}
                  <h2 className="text-xl font-bold text-text-primary">
                    {plan.name}
                  </h2>
                </div>
                <p className="min-h-16 text-sm leading-6 text-text-muted">
                  {plan.description}
                </p>
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
                  <p className="mt-1 text-xs font-semibold text-success">
                    Save about {savings}% annually
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-text-muted">
                    Taxes shown before payment
                  </p>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-text-secondary">
                {Object.entries(plan.features)
                  .filter(
                    ([, allowance]) =>
                      allowance === true ||
                      (typeof allowance === "number" && allowance > 0),
                  )
                  .map(([feature, allowance]) => (
                    <li key={feature} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>
                        {PERSONAL_FEATURE_COPY[feature] ?? feature}
                        {typeof allowance === "number"
                          ? ` (${allowance}/month)`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              <PricingButton
                href={
                  planKey === "free"
                    ? "/login?mode=signup"
                    : "/login?mode=signup&intent=upgrade"
                }
                featured={plan.recommended}
              >
                {planKey === "free"
                  ? "Start free"
                  : planKey === "pro"
                    ? `Try Pro for ${TRIAL_LENGTH_DAYS} days`
                    : `Choose ${plan.name}`}
              </PricingButton>
            </article>
          );
        })}
      </section>

      <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-text-muted">
        Personal and business money stay in separate workspaces. The personal
        trial needs no card and never charges automatically. Student pricing
        requires verification and renews yearly.
      </p>
    </>
  );
}

function BusinessPlanIcon({ planKey }: { planKey: BusinessPlanKey }) {
  if (planKey === "business_free" || planKey === "solo") {
    return <UserRound className="size-5 text-success" aria-hidden="true" />;
  }
  if (planKey === "starter") {
    return <Users className="size-5 text-transfer" aria-hidden="true" />;
  }
  if (planKey === "growth") {
    return <Building2 className="size-5 text-primary" aria-hidden="true" />;
  }
  if (planKey === "scale") {
    return <Network className="size-5 text-investment" aria-hidden="true" />;
  }
  return <Layers3 className="size-5 text-payables" aria-hidden="true" />;
}

function BusinessPlanCards({
  countryCode,
  billingCycle,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
}) {
  return (
    <>
      <section
        className="grid gap-4 lg:grid-cols-3 2xl:grid-cols-6"
        aria-label="Business subscription plans"
      >
        {BUSINESS_PLAN_ORDER.map((planKey) => {
          const plan = BUSINESS_PLANS[planKey];
          const pricedPlanKey =
            planKey === "business_free" || planKey === "enterprise"
              ? null
              : (planKey as PricedBusinessPlanKey);
          const price = pricedPlanKey
            ? getBusinessPlanPrice(
                pricedPlanKey,
                countryCode,
                billingCycle,
              )
            : 0;
          const savings = pricedPlanKey
            ? getBusinessAnnualSavingsPercent(pricedPlanKey, countryCode)
            : 0;

          return (
            <article
              key={plan.key}
              className={`relative flex min-h-full flex-col rounded-3xl border bg-surface p-5 shadow-soft ${
                plan.recommended
                  ? "border-primary shadow-premium"
                  : "border-border"
              }`}
            >
              {plan.recommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Best for growth
                </span>
              ) : null}

              <div className="mb-5">
                <div className="mb-3 flex items-center gap-2">
                  <BusinessPlanIcon planKey={planKey} />
                  <h2 className="text-xl font-bold text-text-primary">
                    {plan.name}
                  </h2>
                </div>
                <p className="min-h-20 text-sm leading-6 text-text-muted">
                  {plan.description}
                </p>
              </div>

              <div className="mb-5">
                {plan.customPricing ? (
                  <>
                    <strong className="text-3xl font-extrabold tracking-tight text-text-primary">
                      Custom
                    </strong>
                    <p className="mt-1 text-xs text-text-muted">
                      Annual contract and consolidated billing
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-1">
                      <strong className="text-3xl font-extrabold tracking-tight text-text-primary">
                        {formatUsdPrice(price)}
                      </strong>
                      <span className="pb-1 text-sm text-text-muted">
                        /{billingCycle === "annual" ? "year" : "month"}
                      </span>
                    </div>
                    {billingCycle === "annual" && pricedPlanKey ? (
                      <p className="mt-1 text-xs font-semibold text-success">
                        Save about {savings}% annually
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-muted">
                        Base workspace price
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-semibold text-text-secondary">
                <span className="rounded-lg bg-surface-inset px-2 py-2">
                  {plan.includedSeats === null
                    ? "Custom seats"
                    : `${plan.includedSeats} seat${plan.includedSeats === 1 ? "" : "s"}`}
                </span>
                <span className="rounded-lg bg-surface-inset px-2 py-2">
                  {plan.includedBranches === null
                    ? "Custom branches"
                    : `${plan.includedBranches} branch${plan.includedBranches === 1 ? "" : "es"}`}
                </span>
              </div>

              <ul className="mb-6 flex-1 space-y-3 text-sm text-text-secondary">
                {Object.entries(plan.features)
                  .filter(
                    ([, allowance]) =>
                      allowance === true ||
                      (typeof allowance === "number" && allowance > 0),
                  )
                  .slice(0, 8)
                  .map(([feature, allowance]) => (
                    <li key={feature} className="flex gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>
                        {BUSINESS_FEATURE_COPY[feature] ?? feature}
                        {typeof allowance === "number"
                          ? ` (${allowance}/month)`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>

              <PricingButton
                href={
                  planKey === "enterprise"
                    ? "/login?mode=signup&workspace=business&intent=enterprise"
                    : planKey === "business_free"
                      ? "/login?mode=signup&workspace=business"
                      : `/login?mode=signup&workspace=business&intent=upgrade&plan=${planKey}`
                }
                featured={plan.recommended}
              >
                {planKey === "enterprise"
                  ? "Plan enterprise rollout"
                  : planKey === "business_free"
                    ? "Create business workspace"
                    : planKey === "growth"
                      ? `Try Growth for ${BUSINESS_TRIAL_LENGTH_DAYS} days`
                      : `Choose ${plan.name}`}
              </PricingButton>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7">
        <div className="mb-5 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Industry modules
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-text-primary">
            Choose business capabilities without changing your company plan.
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Dealership, POS, construction, manufacturing, payroll, CRM, and
            other industries are optional modules—not separate subscription
            universes.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_MODULES.map((module) => (
            <article
              key={module.code}
              className="rounded-2xl border border-border bg-surface-inset p-4"
            >
              <h3 className="font-bold text-text-primary">{module.name}</h3>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                {module.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-4xl text-center text-sm leading-6 text-text-muted">
        Each company receives a separate workspace, subscription, team,
        modules, and invoice. Extra seats, branches, and optional modules are
        billed to that business account. Enterprise groups can connect multiple
        companies under consolidated billing.
      </p>
    </>
  );
}

export default function RegionalPricing({
  initialCountryCode,
}: RegionalPricingProps) {
  const serverCountry = normalizeCountryCode(initialCountryCode);
  const [countryCode, setCountryCode] = useState(serverCountry ?? "US");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [universe, setUniverse] = useState<"personal" | "business">("personal");
  const tier = getPricingTier(countryCode);

  useEffect(() => {
    if (serverCountry) return;
    const browserCountry = detectBrowserCountry();
    if (browserCountry) setCountryCode(browserCountry);
  }, [serverCountry]);

  const countryNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "region" }),
    [],
  );
  const countryOptions = useMemo(
    () =>
      SUPPORTED_COUNTRY_CODES.map((code) => ({
        code,
        name: countryNames.of(code) ?? code,
      })).sort((left, right) => left.name.localeCompare(right.name)),
    [countryNames],
  );
  const countryName = countryNames.of(countryCode) ?? countryCode;

  return (
    <div className="space-y-8">
      <section className="mx-auto grid max-w-5xl gap-4 rounded-3xl border border-border bg-surface p-4 shadow-soft lg:grid-cols-[1fr_auto_auto] lg:items-end lg:p-6">
        <div
          className="grid grid-cols-2 rounded-xl border border-border bg-surface-inset p-1"
          aria-label="Product universe"
        >
          {(["personal", "business"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setUniverse(value)}
              aria-pressed={universe === value}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold capitalize transition ${
                universe === value
                  ? "bg-primary text-primary-foreground shadow-theme"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-text-primary">
          Pricing country
          <select
            value={countryCode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setCountryCode(event.target.value)
            }
            className="min-h-11 rounded-xl border border-border bg-surface-inset px-3 text-sm font-medium outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {countryOptions.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
          <span className="font-normal text-text-muted">
            {countryName} uses regional tier {tier}. Checkout remains the final
            source for local currency and tax.
          </span>
        </label>

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
      </section>

      {universe === "personal" ? (
        <PersonalPlanCards
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      ) : (
        <BusinessPlanCards
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      )}
    </div>
  );
}
