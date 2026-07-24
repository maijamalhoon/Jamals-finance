import { updatePrivacyRequestWorkflow } from "@/app/admin/privacy-actions";
import {
  JalvoroClockIcon,
  JalvoroLockIcon,
} from "@/components/icons/jalvoro/components/objects";
import {
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
  formatAdminGeneratedAt,
  type AdminControlCenterSnapshot,
  type PrivacyRequestQueueItem,
} from "@/lib/admin/control-center";
import { cn } from "@/lib/utils";

type PrivacySnapshot = AdminControlCenterSnapshot["privacy"];

type ActionResult =
  | "updated"
  | "invalid"
  | "forbidden"
  | "missing"
  | "unavailable"
  | null;

const requestTypeLabels: Record<PrivacyRequestQueueItem["requestType"], string> = {
  access: "Data access",
  export: "Data export",
  correction: "Correction",
  deletion: "Deletion",
  restriction: "Restriction",
  objection: "Objection",
  consent_review: "Consent review",
  security_review: "Security review",
};

const statusLabels = {
  pending: "Pending",
  identity_verification: "Identity verification",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
} as const;

const verificationLabels = {
  not_started: "Not started",
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
} as const;

const sourceLabels: Record<PrivacyRequestQueueItem["source"], string> = {
  in_product: "In product",
  support: "Support",
  manual: "Manual",
  system: "System",
};

const actionMessages: Record<Exclude<ActionResult, null>, string> = {
  updated: "Privacy request workflow updated and audited.",
  invalid: "The requested workflow change was invalid or verification is incomplete.",
  forbidden: "This privacy request is assigned elsewhere or your role is read-only.",
  missing: "The privacy request no longer exists.",
  unavailable: "The workflow could not be updated. No partial change was saved.",
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function RequestCard({
  request,
  canManage,
}: {
  request: PrivacyRequestQueueItem;
  canManage: boolean;
}) {
  const controlsEnabled = canManage && request.manageable;

  return (
    <Card className={cn(
      "border-border/70 bg-card/90 shadow-sm",
      request.overdue && "border-destructive/35",
    )}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold tracking-[0.12em] text-muted-foreground">
              {request.requestCode}
            </p>
            <CardTitle className="mt-1 text-lg">
              {requestTypeLabels[request.requestType]}
            </CardTitle>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              request.overdue
                ? "border-destructive/25 bg-destructive/5 text-destructive"
                : "border-warning/25 bg-warning/5 text-warning",
            )}
          >
            {request.overdue ? "Overdue" : statusLabels[request.status]}
          </span>
        </div>
        <CardDescription className="grid gap-2 text-xs sm:grid-cols-2">
          <span>Created {formatAdminGeneratedAt(request.createdAt)} UTC</span>
          <span>
            Due {request.dueAt ? `${formatAdminGeneratedAt(request.dueAt)} UTC` : "not assigned"}
          </span>
          <span>Source: {sourceLabels[request.source]}</span>
          <span>
            Assignment: {request.assignedToMe
              ? "Assigned to you"
              : request.assigned
                ? "Assigned to another administrator"
                : "Unassigned"}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        {controlsEnabled ? (
          <form action={updatePrivacyRequestWorkflow} className="space-y-4">
            <input type="hidden" name="requestCode" value={request.requestCode} />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Workflow status
                <select
                  name="status"
                  defaultValue={request.status}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Identity verification
                <select
                  name="verificationStatus"
                  defaultValue={request.verificationStatus}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  {Object.entries(verificationLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Due date
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={toDateInput(request.dueAt)}
                  className="finance-focus min-h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-divider/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="assignToSelf"
                  defaultChecked={!request.assigned}
                  className="finance-focus size-4 rounded border-input"
                />
                {request.assignedToMe
                  ? "Keep assigned to me"
                  : request.assigned
                    ? "Reassign to me"
                    : "Assign to me"}
              </label>
              <Button type="submit" size="sm" className="sm:min-w-36">
                Save workflow
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Completing a request requires verified identity. Every transition is
              retained as structured audit metadata without request text or finance data.
            </p>
          </form>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/65 p-4">
            <JalvoroLockIcon
              size={18}
              context="content"
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              {canManage
                ? "This request is assigned to another administrator. Only the owner can reassign it."
                : "Your platform role can review this structured ticket, but only an owner or administrator can change it."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrivacyRequestOperations({
  privacy,
  actionResult,
}: {
  privacy: PrivacySnapshot;
  actionResult: ActionResult;
}) {
  return (
    <div id="privacy-queue" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-info">
            Structured queue
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Privacy request operations
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Up to 30 open tickets are ordered by urgency. Only opaque workflow metadata
            is shown; subject identity and request content stay outside this snapshot.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-info/20 bg-info/5 px-3 py-1.5 text-xs font-semibold text-info">
          <JalvoroClockIcon size={15} context="content" aria-hidden="true" />
          {privacy.requestAuditEvents30d} audited transitions · 30d
        </span>
      </div>

      {actionResult ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
            actionResult === "updated"
              ? "border-success/20 bg-success/5 text-success"
              : actionResult === "forbidden"
                ? "border-destructive/20 bg-destructive/5 text-destructive"
                : "border-warning/20 bg-warning/5 text-warning",
          )}
        >
          {actionResult === "updated" ? (
            <JalvoroSuccessIcon size={18} context="content" className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : actionResult === "forbidden" ? (
            <JalvoroWarningIcon size={18} context="content" className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <JalvoroPendingIcon size={18} context="content" className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>{actionMessages[actionResult]}</span>
        </div>
      ) : null}

      {privacy.requestQueue.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {privacy.requestQueue.map((request) => (
            <RequestCard
              key={request.requestCode}
              request={request}
              canManage={privacy.requestOperationsAllowed}
            />
          ))}
        </div>
      ) : (
        <Card className="border-success/20 bg-success/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <JalvoroSuccessIcon
              size={21}
              context="content"
              className="mt-0.5 shrink-0 text-success"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-foreground">No open privacy requests</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The operational queue is clear. Completed and closed requests remain
                represented only through aggregate counts and structured audit history.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
