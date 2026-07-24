import { saveBillingPlan } from "@/app/admin/billing-actions";
import {
  JalvoroCardIcon,
  JalvoroWalletIcon,
} from "@/components/icons/jalvoro/components/finance";
import { JalvoroClockIcon, JalvoroLockIcon } from "@/components/icons/jalvoro/components/objects";
import {
  JalvoroInfoIcon,
  JalvoroPendingIcon,
  JalvoroSuccessIcon,
  JalvoroWarningIcon,
} from "@/components/icons/jalvoro/components/status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatPlanPrice,
  type BillingOperationsSnapshot,
  type BillingPlanCatalogItem,
} from "@/lib/admin/billing-operations";
import { formatAdminCount, formatAdminGeneratedAt } from "@/lib/admin/control-center";
import { cn } from "@/lib/utils";

type BillingActionResult =
  | "saved"
  | "invalid"
  | "forbidden"
  | "unavailable"
  | null;

const inputClass =
  "min-h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-info/60 focus:ring-2 focus:ring-info/15 disabled:cursor-not-allowed disabled:opacity-60";

function ActionNotice({ result }: { result: BillingActionResult }) {
  if (!result) return null;

  const config = {
    saved: {
      title: "Plan catalog saved",
      detail: "The provider-neutral billing plan was updated successfully.",
      className: "border-success/25 bg-success/5 text-success",
      icon: JalvoroSuccessIcon,
    },
    invalid: {
      title: "Plan details rejected",
      detail: "Check the code, price, currency and billing interval.",
      className: "border-warning/25 bg-warning/5 text-warning",
      icon: JalvoroWarningIcon,
    },
    forbidden: {
      title: "Owner access required",
      detail: "Only the active platform owner can change the plan catalog.",
      className: "border-destructive/25 bg-destructive/5 text-destructive",
      icon: JalvoroLockIcon,
    },
    unavailable: {
      title: "Plan update unavailable",
      detail: "The operation was not saved. Existing plans were not changed.",
      className: "border-destructive/25 bg-destructive/5 text-destructive",
      icon: JalvoroWarningIcon,
    },
  }[result];
  const Icon = config.icon;

  return (
    <div className={cn("flex gap-3 rounded-2xl border px-4 py-3", config.className)}>
      <Icon size={19} context="content" className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{config.title}</p>
        <p className="mt-1 text-sm opacity-80">{config.detail}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/88 shadow-sm",
        tone === "positive" && "border-success/20 bg-success/5",
        tone === "warning" && "border-warning/20 bg-warning/5",
        tone === "danger" && "border-destructive/20 bg-destructive/5",
      )}
    >
      <CardHeader>
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-3xl tracking-[-0.04em]">
          {formatAdminCount(value)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function PriceFields({ plan }: { plan?: BillingPlanCatalogItem }) {
  return (
    <>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Billing interval</span>
        <select
          name="billingInterval"
          defaultValue={plan?.billingInterval ?? "month"}
          className={inputClass}
          required
        >
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
          <option value="one_time">One time</option>
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Price</span>
        <input
          name="priceMajor"
          type="number"
          min="0.001"
          max="1000000000"
          step="0.001"
          defaultValue={plan?.priceMajor ?? undefined}
          className={inputClass}
          placeholder="9.99"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Currency</span>
        <input
          name="currency"
          defaultValue={plan?.currency ?? "USD"}
          className={cn(inputClass, "uppercase")}
          minLength={3}
          maxLength={3}
          pattern="[A-Za-z]{3}"
          placeholder="USD"
          required
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Currency decimals</span>
        <select
          name="currencyExponent"
          defaultValue={String(plan?.currencyExponent ?? 2)}
          className={inputClass}
          required
        >
          <option value="0">0 — JPY-style</option>
          <option value="2">2 — USD-style</option>
          <option value="3">3 — KWD-style</option>
        </select>
      </label>
    </>
  );
}

function LockedFreePlan({ plan }: { plan: BillingPlanCatalogItem }) {
  return (
    <Card className="border-info/20 bg-info/5 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription className="mt-1 font-mono">{plan.code}</CardDescription>
          </div>
          <span className="inline-flex items-center rounded-full border border-info/20 bg-background/70 px-2.5 py-1 text-xs font-semibold text-info">
            Protected
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xl font-semibold tracking-tight text-foreground">Free</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/60 bg-background/65 p-3">
            <p className="text-muted-foreground">Users</p>
            <p className="mt-1 font-mono font-semibold">{formatAdminCount(plan.totalUsers)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/65 p-3">
            <p className="text-muted-foreground">Features</p>
            <p className="mt-1 font-semibold">Unlimited</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          The default free plan cannot be removed or converted into a paid plan.
        </p>
      </CardContent>
    </Card>
  );
}

function EditablePlan({
  plan,
  canEdit,
}: {
  plan: BillingPlanCatalogItem;
  canEdit: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription className="mt-1 font-mono">{plan.code}</CardDescription>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
              plan.isActive
                ? "border-success/20 bg-success/5 text-success"
                : "border-border/70 bg-surface-secondary text-muted-foreground",
            )}
          >
            {plan.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {formatPlanPrice(plan)}
          </p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {plan.billingInterval.replaceAll("_", " ")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {[
            ["Total", plan.totalUsers],
            ["Trial", plan.trialUsers],
            ["Active", plan.activeUsers],
            ["Past due", plan.pastDueUsers],
            ["Cancelled", plan.cancelledUsers],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border/60 bg-background/65 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono font-semibold">{formatAdminCount(Number(value))}</p>
            </div>
          ))}
        </div>

        {canEdit && plan.editable ? (
          <form action={saveBillingPlan} className="space-y-4 border-t border-divider/70 pt-5">
            <input type="hidden" name="code" value={plan.code} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 xl:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Plan name</span>
                <input
                  name="name"
                  defaultValue={plan.name}
                  className={inputClass}
                  maxLength={80}
                  required
                />
              </label>
              <PriceFields plan={plan} />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={plan.isActive}
                  className="size-4 rounded border-border"
                />
                Available for future checkout
              </label>
              <Button type="submit" className="min-h-11 sm:min-w-32">
                Save plan
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-3 text-sm text-muted-foreground">
            Read-only. Platform owner access is required to change this plan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BillingPlanOperations({
  billing,
  actionResult,
}: {
  billing: BillingOperationsSnapshot;
  actionResult: BillingActionResult;
}) {
  const paidPlans = billing.planCatalog.filter((plan) => plan.kind === "paid");
  const freePlan = billing.planCatalog.find((plan) => plan.kind === "free");

  return (
    <section id="billing-operations" aria-labelledby="billing-operations-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            Owner operations
          </p>
          <h2 id="billing-operations-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Billing plans and provider health
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Manage commercial plan metadata without attaching feature limits or exposing subscriber payment details.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
            billing.operationsAllowed
              ? "border-success/20 bg-success/5 text-success"
              : "border-border/70 bg-surface-secondary text-muted-foreground",
          )}
        >
          {billing.operationsAllowed ? "Owner controls enabled" : "Read-only access"}
        </span>
      </div>

      <ActionNotice result={actionResult} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Webhook received 24h"
          value={billing.webhooks.received24h}
          detail="Provider events received without storing raw payloads."
          tone="neutral"
        />
        <Metric
          label="Webhook pending"
          value={billing.webhooks.pending}
          detail="Events waiting for future provider processing."
          tone={billing.webhooks.pending > 0 ? "warning" : "positive"}
        />
        <Metric
          label="Webhook failed 24h"
          value={billing.webhooks.failed24h}
          detail="Failed provider synchronisation attempts."
          tone={billing.webhooks.failed24h > 0 ? "danger" : "positive"}
        />
        <Metric
          label="Plan changes 30d"
          value={billing.auditEvents30d}
          detail="Structured owner plan-catalog audit events."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroCardIcon size={21} context="heading" className="text-info" aria-hidden="true" />
              <CardTitle>Provider connection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-foreground">
              {billing.providerConnected ? "Provider references detected" : "No payment provider connected"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Checkout and webhooks can be connected later without redesigning the plan catalog.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroClockIcon size={21} context="heading" className="text-info" aria-hidden="true" />
              <CardTitle>Last provider activity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Received: <span className="font-medium text-foreground">{billing.webhooks.lastReceivedAt ? `${formatAdminGeneratedAt(billing.webhooks.lastReceivedAt)} UTC` : "Never"}</span>
            </p>
            <p className="text-muted-foreground">
              Processed: <span className="font-medium text-foreground">{billing.webhooks.lastProcessedAt ? `${formatAdminGeneratedAt(billing.webhooks.lastProcessedAt)} UTC` : "Never"}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroWalletIcon size={21} context="heading" className="text-success" aria-hidden="true" />
              <CardTitle>Protected boundaries</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
            <p>Raw webhook payloads: not stored</p>
            <p>Card or bank credentials: not stored</p>
            <p>Feature limits: not attached</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {freePlan ? <LockedFreePlan plan={freePlan} /> : null}
        {paidPlans.map((plan) => (
          <EditablePlan key={plan.code} plan={plan} canEdit={billing.operationsAllowed} />
        ))}
      </div>

      {billing.operationsAllowed ? (
        <Card className="border-info/20 bg-info/5 shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-info/20 bg-background/70 text-info">
                <JalvoroPendingIcon size={20} context="heading" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Create paid plan</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  Adds commercial pricing metadata only. It does not create checkout or restrict product modules.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form action={saveBillingPlan} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Plan code</span>
                  <input
                    name="code"
                    className={inputClass}
                    placeholder="pro_monthly"
                    minLength={2}
                    maxLength={40}
                    pattern="[a-z0-9][a-z0-9_-]{1,39}"
                    required
                  />
                </label>
                <label className="space-y-1.5 xl:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Plan name</span>
                  <input name="name" className={inputClass} placeholder="JALVORO Pro" maxLength={80} required />
                </label>
                <PriceFields />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded border-border" />
                  Active for future checkout
                </label>
                <Button type="submit" className="min-h-11 sm:min-w-40">
                  Create plan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {(billing.expiredAuditPending > 0 || billing.webhooks.expiredPending > 0) && (
        <div className="flex gap-3 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-warning">
          <JalvoroInfoIcon size={19} context="content" className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">
            Retention cleanup has {formatAdminCount(billing.expiredAuditPending)} expired plan-audit rows and {formatAdminCount(billing.webhooks.expiredPending)} expired webhook rows pending.
          </p>
        </div>
      )}
    </section>
  );
}
