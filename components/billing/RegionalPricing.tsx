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
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  BUSINESS_PLAN_ORDER,
  BUSINESS_PLANS,
  BUSINESS_SYSTEMS,
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
  ai_insights: "Monthly personal AI insight allowance",
  forecasting: "Financial forecasting",
  priority_support: "Priority support",
};

const BUSINESS_FEATURE_COPY: Record<string, string> = {
  business_core: "Nature-specific business system",
  invoicing: "Invoices and sales records",
  expenses: "Business expenses and purchases",
  contacts: "Customers and suppliers",
  basic_reports: "Essential business reports",
  advanced_reports: "Advanced business reporting",
  inventory_ready: "Inventory workflows where relevant",
  crm_ready: "CRM workflows where relevant",
  branch_management: "Multiple branches",
  department_controls: "Departments and operating controls",
  approval_workflows: "Approval workflows",
  audit_log: "Audit history",
  api_access: "API access",
  consolidated_reporting: "Group-level consolidated reporting",
  priority_support: "Priority support",
};

const SUPPORTED_COUNTRIES = new Set<string>(SUPPORTED_COUNTRY_CODES);

type RegionalPricingProps = {
  initialCountryCode?: string | null;
};

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
      // Continue through the browser locale list.
    }
  }

  return null;
}

function ChoiceButton({
  href,
  featured,
  children,
}: {
  href: string;
  featured?: boolean;
  children: ReactNode;
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

function FeatureList({
  features,
  copy,
}: {
  features: Record<string, boolean | number | undefined>;
  copy: Record<string, string>;
}) {
  return (
    <ul className="mb-6 flex-1 space-y-3 text-sm text-text-secondary">
      {Object.entries(features)
        .filter(
          ([, allowance]) =>
            allowance === true ||
            (typeof allowance === "number" && allowance > 0),
        )
        .slice(0, 9)
        .map(([feature, allowance]) => (
          <li key={feature} className="flex gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <span>
              {copy[feature] ?? feature}
              {typeof allowance === "number"
                ? ` (${allowance}/month)`
                : ""}
            </span>
          </li>
        ))}
    </ul>
  );
}

function PersonalPricing({
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
          const personalCheckoutPath = paidPlanKey
            ? `/billing/personal-checkout?plan=${paidPlanKey}&cycle=${billingCycle}&country=${countryCode}`
            : null;

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
                <p className="mt-1 text-xs text-text-muted">
                  {billingCycle === "annual" && paidPlanKey
                    ? `Save about ${savings}% annually`
                    : "Taxes shown before payment"}
                </p>
              </div>

              <FeatureList
                features={plan.features}
                copy={PERSONAL_FEATURE_COPY}
              />

              <ChoiceButton
                href={
                  planKey === "free"
                    ? "/login?mode=signup"
                    : `/login?mode=signup&next=${encodeURIComponent(personalCheckoutPath ?? "/pricing")}`
                }
                featured={plan.recommended}
              >
                {planKey === "free"
                  ? "Continue Free"
                  : planKey === "pro"
                    ? `Try Pro for ${TRIAL_LENGTH_DAYS} days`
                    : `Choose ${plan.name}`}
              </ChoiceButton>
            </article>
          );
        })}
      </section>

      <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-text-muted">
        AI is available only inside the personal universe. Personal and business
        records always remain separate.
      </p>
    </>
  );
}

function BusinessIcon({ planKey }: { planKey: BusinessPlanKey }) {
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

export function BusinessPlanGrid({
  countryCode,
  billingCycle,
  businessId,
  freeHref,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
  businessId?: string;
  freeHref?: string;
}) {
  return (
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
          ? getBusinessPlanPrice(pricedPlanKey, countryCode, billingCycle)
          : 0;
        const savings = pricedPlanKey
          ? getBusinessAnnualSavingsPercent(pricedPlanKey, countryCode)
          : 0;
        const intent = businessId
          ? `&businessId=${encodeURIComponent(businessId)}`
          : "";

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
                <BusinessIcon planKey={planKey} />
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
                <strong className="text-3xl font-extrabold text-text-primary">
                  Custom
                </strong>
              ) : (
                <div className="flex items-end gap-1">
                  <strong className="text-3xl font-extrabold tracking-tight text-text-primary">
                    {formatUsdPrice(price)}
                  </strong>
                  <span className="pb-1 text-sm text-text-muted">
                    /{billingCycle === "annual" ? "year" : "month"}
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-text-muted">
                {plan.customPricing
                  ? "Annual contract and consolidated billing"
                  : billingCycle === "annual" && pricedPlanKey
                    ? `Save about ${savings}% annually`
                    : "Base workspace price"}
              </p>
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

            <FeatureList
              features={plan.features}
              copy={BUSINESS_FEATURE_COPY}
            />

            <ChoiceButton
              href={
                planKey === "business_free"
                  ? freeHref ?? "/login?mode=signup&workspace=business"
                  : planKey === "enterprise"
                    ? `/login?mode=signup&workspace=business&intent=enterprise${intent}`
                    : `/login?mode=signup&workspace=business&intent=upgrade&plan=${planKey}${intent}`
              }
              featured={plan.recommended}
            >
              {planKey === "enterprise"
                ? "Plan enterprise rollout"
                : planKey === "business_free"
                  ? "Continue Free"
                  : planKey === "growth"
                    ? `Try Growth for ${BUSINESS_TRIAL_LENGTH_DAYS} days`
                    : `Choose ${plan.name}`}
            </ChoiceButton>
          </article>
        );
      })}
    </section>
  );
}

function BusinessPricing({
  countryCode,
  billingCycle,
}: {
  countryCode: string;
  billingCycle: BillingCycle;
}) {
  return (
    <>
      <BusinessPlanGrid
        countryCode={countryCode}
        billingCycle={billingCycle}
      />

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-7">
        <div className="mb-5 max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Nature-specific systems
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-text-primary">
            Every business nature gets its own operating system.
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            POS, dealership, restaurant, construction, manufacturing, service
            business, and enterprise workflows may reuse verified accounting
            primitives, but their screens, roles, conditions, and operations
            remain purpose-built.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUSINESS_SYSTEMS.map((system) => (
            <article
              key={system.code}
              className="rounded-2xl border border-border bg-surface-inset p-4"
            >
              <h3 className="font-bold text-text-primary">{system.name}</h3>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                {system.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mx-auto max-w-4xl text-center text-sm leading-6 text-text-muted">
        Business and enterprise plans contain no AI entitlement. Each company
        keeps separate users, roles, permissions, subscription, and invoice.
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
      <section className="mx-auto grid max-w-5xl gap-4 rounded-3xl border border-border bg-surface p-4 shadow-soft lg:grid-cols-[auto_1fr_auto] lg:items-end lg:p-6">
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
        <PersonalPricing
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      ) : (
        <BusinessPricing
          countryCode={countryCode}
          billingCycle={billingCycle}
        />
      )}
    </div>
  );
}
