import {
  JalvoroShieldMoneyIcon,
} from "@/components/icons/jalvoro/components/finance";
import {
  JalvoroUsersIcon,
} from "@/components/icons/jalvoro/components/identity";
import {
  JalvoroAnalyticsIcon,
} from "@/components/icons/jalvoro/components/navigation";
import {
  JalvoroClockIcon,
  JalvoroLockIcon,
} from "@/components/icons/jalvoro/components/objects";
import {
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
type PrivacySnapshot = AdminControlCenterSnapshot["privacy"];

function PrivacyMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  icon: JalvoroIconComponent;
  tone?: Tone;
}) {
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

function BoundaryRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-success/15 bg-background/65 px-4 py-3">
      <JalvoroSuccessIcon
        size={18}
        context="content"
        className="mt-0.5 shrink-0 text-success"
        aria-hidden="true"
      />
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

export default function PrivacyGovernancePanel({
  privacy,
}: {
  privacy: PrivacySnapshot;
}) {
  const expiredBacklog =
    privacy.expiredTelemetryPending + privacy.expiredAdminAuditPending;
  const requiresAttention = privacy.overdueRequests > 0 || expiredBacklog > 0;
  const statusTone: Tone = requiresAttention ? "danger" : "positive";

  return (
    <section
      aria-labelledby="admin-privacy-heading"
      className="mx-auto mt-6 w-full max-w-[1500px] space-y-4 pb-12"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            Privacy governance
          </p>
          <h2
            id="admin-privacy-heading"
            className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            Requests, retention and access boundaries
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Aggregate operational controls only. Individual finance records,
            emails, notes, request messages and payment credentials are never
            returned to this dashboard.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
            toneClasses[statusTone],
          )}
        >
          {requiresAttention
            ? "Privacy operations need review"
            : "Privacy operations healthy"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <PrivacyMetric
          label="Open requests"
          value={privacy.openRequests}
          detail="Pending, verification or in-progress privacy workflows."
          icon={JalvoroPendingIcon}
          tone={privacy.openRequests > 0 ? "warning" : "positive"}
        />
        <PrivacyMetric
          label="Overdue"
          value={privacy.overdueRequests}
          detail="Open requests that passed their assigned due date."
          icon={JalvoroWarningIcon}
          tone={privacy.overdueRequests > 0 ? "danger" : "positive"}
        />
        <PrivacyMetric
          label="Completed 30d"
          value={privacy.completedRequests30d}
          detail="Privacy workflows completed during the last 30 days."
          icon={JalvoroSuccessIcon}
          tone="positive"
        />
        <PrivacyMetric
          label="Admin views 30d"
          value={privacy.adminViews30d}
          detail="Audited accesses to private aggregate control-center data."
          icon={JalvoroLockIcon}
          tone="info"
        />
        <PrivacyMetric
          label="Stored events"
          value={privacy.telemetryEventsStored}
          detail="Privacy-minimised telemetry rows currently within retention."
          icon={JalvoroAnalyticsIcon}
          tone="info"
        />
        <PrivacyMetric
          label="Expired backlog"
          value={expiredBacklog}
          detail="Expired telemetry or admin audit rows awaiting cleanup."
          icon={JalvoroClockIcon}
          tone={expiredBacklog > 0 ? "danger" : "positive"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-info/20 bg-info/5 text-info">
                <JalvoroClockIcon
                  size={20}
                  context="heading"
                  aria-hidden="true"
                />
              </span>
              <div>
                <CardTitle>Retention operations</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  Cleanup is measurable without exposing deleted record content.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Telemetry retention</span>
              <strong className="font-mono text-foreground">
                {privacy.telemetryRetentionDays} days
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Admin audit retention</span>
              <strong className="font-mono text-foreground">
                {privacy.adminAuditRetentionMonths} months
              </strong>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-divider/70 pt-3">
              <span>Last cleanup</span>
              <strong className="text-right font-mono text-xs text-foreground">
                {privacy.lastRetentionRunAt
                  ? `${formatAdminGeneratedAt(privacy.lastRetentionRunAt)} UTC`
                  : "Not run yet"}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Rows removed last run</span>
              <strong className="font-mono text-foreground">
                {formatAdminCount(privacy.lastRetentionRowsDeleted)}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5 shadow-sm lg:col-span-2">
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
                <CardTitle>Enforced data boundaries</CardTitle>
                <CardDescription className="mt-1 leading-6">
                  The snapshot contract fails closed if any protected boundary is
                  reported as enabled.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <BoundaryRow>Raw IP addresses are not stored in custom telemetry.</BoundaryRow>
            <BoundaryRow>Session replay and screen recording remain disabled.</BoundaryRow>
            <BoundaryRow>
              Balances, transaction values, notes and typed finance content are
              excluded from telemetry.
            </BoundaryRow>
            <BoundaryRow>
              {formatAdminCount(privacy.telemetrySubjectsStored)} pseudonymous
              subject mappings exist; the admin snapshot cannot reveal their user
              identities.
            </BoundaryRow>
          </CardContent>
        </Card>
      </div>

      <Card className="border-info/20 bg-info/5 shadow-sm">
        <CardHeader>
          <div className="flex items-start gap-3">
            <JalvoroUsersIcon
              size={22}
              context="heading"
              className="mt-0.5 shrink-0 text-info"
              aria-hidden="true"
            />
            <div>
              <CardTitle>Privacy request queue is future-ready</CardTitle>
              <CardDescription className="mt-1 leading-6">
                Access, export, correction, deletion, restriction, objection,
                consent-review and security-review workflows can be tracked with
                structured status only. No free-text request body or financial
                content is stored in the queue.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </section>
  );
}
