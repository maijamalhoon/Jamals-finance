"use client";

import { useMemo, useState } from "react";

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
} from "@/lib/admin/control-center";
import type {
  AdminUserDirectoryItem,
  AdminUserOperationsSnapshot,
  UserActivityState,
} from "@/lib/admin/user-operations";
import { cn } from "@/lib/utils";

const REFERENCE_PATTERN = /^USR-[A-F0-9]{0,12}$/;

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="border-border/70 bg-card/88 shadow-sm">
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

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" &&
          "border-border/70 bg-background text-muted-foreground",
        tone === "positive" &&
          "border-success/25 bg-success/5 text-success",
        tone === "warning" &&
          "border-warning/25 bg-warning/5 text-warning",
        tone === "danger" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
        tone === "info" && "border-info/25 bg-info/5 text-info",
      )}
    >
      {children}
    </span>
  );
}

function activityLabel(state: UserActivityState) {
  return {
    active_30d: "Active in 30 days",
    quiet_90d: "Quiet 30–90 days",
    inactive_90d: "Inactive 90+ days",
    never_signed_in: "Never signed in",
  }[state];
}

function activityTone(state: UserActivityState) {
  if (state === "active_30d") return "positive" as const;
  if (state === "quiet_90d") return "info" as const;
  if (state === "inactive_90d") return "warning" as const;
  return "neutral" as const;
}

function subscriptionTone(item: AdminUserDirectoryItem) {
  if (item.subscriptionStatus === "active") return "positive" as const;
  if (item.subscriptionStatus === "trialing") return "info" as const;
  if (item.subscriptionStatus === "past_due") return "danger" as const;
  if (
    item.subscriptionStatus === "paused" ||
    item.subscriptionStatus === "incomplete"
  ) {
    return "warning" as const;
  }
  return "neutral" as const;
}

function formatNullableDate(value: string | null) {
  return value ? formatAdminGeneratedAt(value) : "Not available";
}

export default function AdminUserOperationsPanel({
  operations,
}: {
  operations: AdminUserOperationsSnapshot;
}) {
  const [referenceQuery, setReferenceQuery] = useState("");
  const normalizedQuery = referenceQuery.trim().toUpperCase();
  const validQuery =
    normalizedQuery.length === 0 || REFERENCE_PATTERN.test(normalizedQuery);

  const visibleUsers = useMemo(() => {
    if (!normalizedQuery || !validQuery) return operations.users;
    return operations.users.filter((user) =>
      user.userReference.startsWith(normalizedQuery),
    );
  }, [normalizedQuery, operations.users, validQuery]);

  return (
    <div id="admin-users" className="space-y-5 scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            User and account operations
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Masked account directory
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Onboarding, activity and subscription state without exposing full
            identities, provider references or finance records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="positive">Read-only safeguards</StatusPill>
          <StatusPill tone="info">Opaque lookup only</StatusPill>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Total users"
          value={operations.counts.totalUsers}
          detail="Non-deleted authenticated accounts."
        />
        <Metric
          label="Onboarded"
          value={operations.counts.onboardingComplete}
          detail="Profiles that completed onboarding."
        />
        <Metric
          label="Pending setup"
          value={operations.counts.onboardingPending}
          detail="Accounts still completing setup."
        />
        <Metric
          label="Signed in 30d"
          value={operations.counts.signedIn30d}
          detail="Recent account access, not finance activity."
        />
        <Metric
          label="Inactive 90d"
          value={operations.counts.inactive90d}
          detail="Previously signed-in accounts inactive for 90+ days."
        />
        <Metric
          label="Never signed in"
          value={operations.counts.neverSignedIn}
          detail="Accounts without a recorded sign-in."
        />
        <Metric
          label="Free"
          value={operations.counts.freeUsers}
          detail="Accounts currently classified as free."
        />
        <Metric
          label="Trials"
          value={operations.counts.trialingUsers}
          detail="Accounts in a trialing subscription state."
        />
        <Metric
          label="Active paid"
          value={operations.counts.activePaidUsers}
          detail="Active subscriptions on paid plans."
        />
        <Metric
          label="Past due"
          value={operations.counts.pastDueUsers}
          detail="Subscriptions requiring billing attention."
        />
      </div>

      <Card className="border-border/70 bg-card/88 shadow-sm">
        <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Safe support lookup</CardTitle>
            <CardDescription className="mt-1">
              Search only by the opaque reference shown in the panel. Email and
              username search are intentionally unavailable.
            </CardDescription>
          </div>
          <label className="block w-full max-w-md space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              User reference
            </span>
            <input
              value={referenceQuery}
              onChange={(event) => setReferenceQuery(event.target.value)}
              className={cn(
                "min-h-11 w-full rounded-xl border bg-background px-3 py-2 font-mono text-sm uppercase text-foreground outline-none transition focus:ring-2",
                validQuery
                  ? "border-border/80 focus:border-info/60 focus:ring-info/15"
                  : "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
              )}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              placeholder="USR-A1B2C3D4E5F6"
              aria-invalid={!validQuery}
            />
            {!validQuery ? (
              <span className="block text-xs text-destructive">
                Use the USR- reference format only.
              </span>
            ) : null}
          </label>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-surface-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Onboarding</th>
                  <th className="px-4 py-3 font-semibold">Activity</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/70">
                {visibleUsers.map((user) => (
                  <tr key={user.userReference}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {user.maskedEmail}
                      </p>
                      <code className="font-mono text-xs text-muted-foreground">
                        {user.userReference}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        tone={
                          user.onboardingStatus === "complete"
                            ? "positive"
                            : "warning"
                        }
                      >
                        {user.onboardingStatus === "complete"
                          ? "Complete"
                          : "Pending"}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={activityTone(user.activityState)}>
                        {activityLabel(user.activityState)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {user.planName}
                      </p>
                      <code className="font-mono text-xs text-muted-foreground">
                        {user.planCode}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={subscriptionTone(user)}>
                          {user.subscriptionStatus.replaceAll("_", " ")}
                        </StatusPill>
                        {user.cancelAtPeriodEnd ? (
                          <StatusPill tone="warning">Cancels at period end</StatusPill>
                        ) : null}
                      </div>
                      {user.trialEndsAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Trial ends {formatNullableDate(user.trialEndsAt)}
                        </p>
                      ) : user.currentPeriodEnd ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Period ends {formatNullableDate(user.currentPeriodEnd)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatAdminGeneratedAt(user.joinedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatNullableDate(user.lastSignInAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleUsers.length === 0 ? (
              <div className="border-t border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No account matches that opaque reference in the latest 100-user
                directory window.
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Showing up to 100 newest accounts. Activity is based only on account
            sign-in timestamps; it does not inspect transactions, balances or
            workspace content.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/88 shadow-sm">
        <CardHeader>
          <CardTitle>Directory privacy boundaries</CardTitle>
          <CardDescription>
            These values are enforced by the database snapshot and validated
            again before rendering.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Full email returned", operations.rawEmailReturned ? "Yes" : "No"],
            ["User UUID returned", operations.userIdReturned ? "Yes" : "No"],
            ["Finance data returned", operations.financeDataReturned ? "Yes" : "No"],
            [
              "Provider identifiers returned",
              operations.providerIdentifiersReturned ? "Yes" : "No",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
