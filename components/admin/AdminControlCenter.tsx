import type { CSSProperties } from "react";

import {
  JalvoroGlobeIcon,
} from "@/components/icons/jalvoro/components/communication";
import {
  JalvoroCardIcon,
  JalvoroShieldMoneyIcon,
  JalvoroTrendUpIcon,
  JalvoroWalletIcon,
} from "@/components/icons/jalvoro/components/finance";
import {
  JalvoroUsersIcon,
} from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroDashboardIcon,
  JalvoroAnalyticsIcon,
} from "@/components/icons/jalvoro/components/navigation";
import {
  JalvoroClockIcon,
  JalvoroLockIcon,
} from "@/components/icons/jalvoro/components/objects";
import {
  JalvoroInfoIcon,
  JalvoroPendingIcon,
  JalvoroSuccessIcon,
  JalvoroWarningIcon,
} from "@/components/icons/jalvoro/components/status";
import type { JalvoroIconComponent } from "@/components/icons/jalvoro/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
  type AdminControlCenterSnapshot,
  type AdminCountBreakdown,
  type AdminRouteBreakdown,
} from "@/lib/admin/control-center";
import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "border-border/70 bg-card text-foreground",
  info: "border-info/20 bg-info/5 text-info",
  positive: "border-success/20 bg-success/5 text-success",
  warning: "border-warning/20 bg-warning/5 text-warning",
  danger: "border-destructive/20 bg-destructive/5 text-destructive",
} as const;

type Tone = keyof typeof toneClasses;

type MetricCardProps = {
  label: string;
  value: number;
  detail: string;
  icon: JalvoroIconComponent;
  tone?: Tone;
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <Card className="min-h-36 border-border/70 bg-card/88 shadow-sm">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <CardDescription className="text-xs font-semibold uppercase tracking-[0.14em]">
            {label}
          </CardDescription>
          <CardTitle className="mt-3 font-mono text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {formatAdminCount(value)}
          </CardTitle>
        </div>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl border",
            toneClasses[tone],
          )}
        >
          <Icon size={20} context="heading" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-7 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function BreakdownList({
  items,
  emptyLabel,
}: {
  items: AdminCountBreakdown[];
  emptyLabel: string;
}) {
  if (items.length === 0) return <EmptyList>{emptyLabel}</EmptyList>;

  const maximum = Math.max(...items.map((item) => item.users), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.max(4, Math.round((item.users / maximum) * 100));
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">
                {item.label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatAdminCount(item.users)} users
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-info/70"
                style={{ width: `${width}%` } as CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RouteList({
  items,
  emptyLabel,
  countLabel,
}: {
  items: AdminRouteBreakdown[];
  emptyLabel: string;
  countLabel: string;
}) {
  if (items.length === 0) return <EmptyList>{emptyLabel}</EmptyList>;

  return (
    <div className="divide-y divide-divider/70">
      {items.map((item) => (
        <div
          key={item.route}
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <code className="min-w-0 truncate font-mono text-xs text-foreground sm:text-sm">
            {item.route}
          </code>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatAdminCount(item.count)} {countLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminControlCenter({
  snapshot,
}: {
  snapshot: AdminControlCenterSnapshot;
}) {
  const providerTone: Tone = snapshot.billing.providerConnected
    ? "positive"
    : "warning";
  const performanceTone: Tone =
    snapshot.telemetry.poorPerformanceSignals7d > 0 ? "warning" : "positive";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/92 p-5 shadow-sm sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-info/8 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="positive">
                <JalvoroLockIcon
                  size={14}
                  context="compact"
                  className="mr-1.5"
                  aria-hidden="true"
                />
                Private control room
              </StatusPill>
              <StatusPill>{snapshot.adminRole}</StatusPill>
              <StatusPill tone="info">Features unlimited</StatusPill>
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
              JALVORO Admin Control Center
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
              User growth, billing segments, product activity and performance
              signals in one privacy-minimised, server-rendered workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
            <JalvoroClockIcon
              size={18}
              context="content"
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-foreground">Snapshot generated</p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatAdminGeneratedAt(snapshot.generatedAt)} UTC
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-users-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Audience
            </p>
            <h2
              id="admin-users-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              User growth and activity
            </h2>
          </div>
          <StatusPill tone="info">Aggregated only</StatusPill>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total users"
            value={snapshot.users.total}
            detail="Registered non-anonymous accounts."
            icon={JalvoroUsersIcon}
            tone="info"
          />
          <MetricCard
            label="New in 7 days"
            value={snapshot.users.new7d}
            detail="Fresh accounts created this week."
            icon={JalvoroTrendUpIcon}
            tone="positive"
          />
          <MetricCard
            label="Signed in 24h"
            value={snapshot.users.signedIn24h}
            detail="Accounts with a recent successful sign-in."
            icon={JalvoroDashboardIcon}
          />
          <MetricCard
            label="Active in product"
            value={snapshot.telemetry.activeUsers24h}
            detail="Pseudonymous users observed in the last 24 hours."
            icon={JalvoroAnalyticsIcon}
            tone="info"
          />
          <MetricCard
            label="New in 30 days"
            value={snapshot.users.new30d}
            detail="Monthly acquisition without personal details."
            icon={JalvoroGlobeIcon}
          />
        </div>
      </section>

      <section aria-labelledby="admin-billing-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Billing readiness
            </p>
            <h2
              id="admin-billing-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Free, trial and paid users
            </h2>
          </div>
          <StatusPill tone={providerTone}>
            {snapshot.billing.providerConnected
              ? "Payment provider connected"
              : "Payment provider not connected"}
          </StatusPill>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Free users"
            value={snapshot.billing.freeUsers}
            detail="Default account segment with unlimited product features."
            icon={JalvoroWalletIcon}
            tone="info"
          />
          <MetricCard
            label="Trial users"
            value={snapshot.billing.trialUsers}
            detail="Future provider trials will appear here automatically."
            icon={JalvoroPendingIcon}
            tone="warning"
          />
          <MetricCard
            label="Paid users"
            value={snapshot.billing.paidUsers}
            detail="Active paid subscriptions after provider integration."
            icon={JalvoroCardIcon}
            tone="positive"
          />
          <MetricCard
            label="Past due"
            value={snapshot.billing.pastDueUsers}
            detail="Subscriptions requiring payment recovery."
            icon={JalvoroWarningIcon}
            tone="danger"
          />
          <MetricCard
            label="Cancelled"
            value={snapshot.billing.cancelledUsers}
            detail="Cancelled or expired subscription records."
            icon={JalvoroInfoIcon}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Plan distribution</CardTitle>
              <CardDescription>
                Commercial segmentation only. No feature-limit engine is attached.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.billing.plans.length === 0 ? (
                <EmptyList>No subscription records are available yet.</EmptyList>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border/70">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-surface-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Plan</th>
                        <th className="px-4 py-3 font-semibold">Kind</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Users</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/70">
                      {snapshot.billing.plans.map((plan) => (
                        <tr key={`${plan.code}-${plan.status}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{plan.name}</p>
                            <code className="font-mono text-xs text-muted-foreground">
                              {plan.code}
                            </code>
                          </td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">
                            {plan.kind}
                          </td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">
                            {plan.status.replaceAll("_", " ")}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                            {formatAdminCount(plan.users)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-success/20 bg-success/5 shadow-sm">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-success/20 bg-background/70 text-success">
                  <JalvoroShieldMoneyIcon
                    size={21}
                    context="heading"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <CardTitle>Unlimited feature policy</CardTitle>
                  <CardDescription className="mt-1 leading-6">
                    Plans classify billing status; they do not disable reports,
                    imports, exports or finance tools.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Provider references stay server-side.</p>
              <p>Raw webhook payloads, card numbers and CVV are never stored.</p>
              <p>Payment failure never blocks the core finance workspace.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="admin-health-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
              Product health
            </p>
            <h2
              id="admin-health-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              Usage and performance signals
            </h2>
          </div>
          <StatusPill tone={performanceTone}>
            {snapshot.telemetry.poorPerformanceSignals7d > 0
              ? "Performance signals need review"
              : "No poor signals recorded"}
          </StatusPill>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Events in 24h"
            value={snapshot.telemetry.events24h}
            detail="Approved privacy-safe product and performance events."
            icon={JalvoroAnalyticsIcon}
            tone="info"
          />
          <MetricCard
            label="Active in 30d"
            value={snapshot.telemetry.activeUsers30d}
            detail="Distinct pseudonymous telemetry subjects."
            icon={JalvoroUsersIcon}
          />
          <MetricCard
            label="Failed operations"
            value={snapshot.telemetry.failedOperations7d}
            detail="Safe failure codes recorded over seven days."
            icon={JalvoroWarningIcon}
            tone={snapshot.telemetry.failedOperations7d > 0 ? "danger" : "positive"}
          />
          <MetricCard
            label="Slow signals"
            value={snapshot.telemetry.poorPerformanceSignals7d}
            detail="Poor Web Vitals and long tasks over seven days."
            icon={JalvoroClockIcon}
            tone={performanceTone}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Top routes</CardTitle>
              <CardDescription>Most observed routes over seven days.</CardDescription>
            </CardHeader>
            <CardContent>
              <RouteList
                items={snapshot.telemetry.topRoutes}
                emptyLabel="No route events have been recorded."
                countLabel="events"
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Slow routes</CardTitle>
              <CardDescription>
                Routes with poor Web Vitals or long-task signals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteList
                items={snapshot.telemetry.slowRoutes}
                emptyLabel="No slow-route signals have been recorded."
                countLabel="signals"
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Devices</CardTitle>
              <CardDescription>Broad device classes over 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownList
                items={snapshot.telemetry.devices}
                emptyLabel="Device telemetry is not active yet."
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/88 shadow-sm">
            <CardHeader>
              <CardTitle>Countries</CardTitle>
              <CardDescription>
                Approximate country codes without raw IP storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BreakdownList
                items={snapshot.telemetry.countries}
                emptyLabel="Country telemetry is not active yet."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-success/20 bg-success/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroSuccessIcon
                size={22}
                context="heading"
                className="text-success"
                aria-hidden="true"
              />
              <CardTitle>Rendering protected</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            This page is a Server Component with one aggregate RPC. No chart
            library, live polling or session replay is loaded.
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-info/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroInfoIcon
                size={22}
                context="heading"
                className="text-info"
                aria-hidden="true"
              />
              <CardTitle>Privacy boundary</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            The control center receives aggregated counts only—no finance
            values, notes, email list, password, card data or raw IP address.
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <JalvoroPendingIcon
                size={22}
                context="heading"
                className="text-warning"
                aria-hidden="true"
              />
              <CardTitle>Provider-ready</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Stripe, Paddle or another provider can update the same subscription
            records later without redesigning this UI.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
