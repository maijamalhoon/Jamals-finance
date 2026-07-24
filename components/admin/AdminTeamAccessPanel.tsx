"use client";

import { useActionState, useState } from "react";

import {
  createAdminInvitationAction,
  revokeAdminInvitationAction,
  updateAdminMemberAction,
  type CreateAdminInvitationState,
} from "@/app/admin/access-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminAccessEvent,
  AdminAccessSnapshot,
  PlatformAdminRole,
} from "@/lib/admin/access-operations";
import {
  formatAdminCount,
  formatAdminGeneratedAt,
} from "@/lib/admin/control-center";
import { cn } from "@/lib/utils";

type AccessActionResult =
  | "updated"
  | "revoked"
  | "accepted"
  | "invalid"
  | "forbidden"
  | "missing"
  | "unavailable"
  | null;

const initialInvitationState: CreateAdminInvitationState = {
  status: "idle",
  accessCode: null,
  invitationCode: null,
  maskedEmail: null,
  role: null,
  expiresAt: null,
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-info/60 focus:ring-2 focus:ring-info/15 disabled:cursor-not-allowed disabled:opacity-60";

function Pill({
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

function ActionNotice({ result }: { result: AccessActionResult }) {
  if (!result) return null;

  const messages = {
    updated: ["Access updated", "The member access state was saved.", "positive"],
    revoked: ["Invitation revoked", "The one-time code is no longer valid.", "positive"],
    accepted: ["Invitation accepted", "The assigned panel role is now active.", "positive"],
    invalid: ["Request rejected", "The submitted access operation was invalid.", "warning"],
    forbidden: ["Owner access required", "This operation is not permitted.", "danger"],
    missing: ["Record unavailable", "The member or invitation is no longer actionable.", "warning"],
    unavailable: ["Operation unavailable", "No access state was changed.", "danger"],
  }[result] as [string, string, "positive" | "warning" | "danger"];

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        messages[2] === "positive" &&
          "border-success/25 bg-success/5 text-success",
        messages[2] === "warning" &&
          "border-warning/25 bg-warning/5 text-warning",
        messages[2] === "danger" &&
          "border-destructive/25 bg-destructive/5 text-destructive",
      )}
    >
      <p className="font-semibold">{messages[0]}</p>
      <p className="mt-1 text-sm opacity-80">{messages[1]}</p>
    </div>
  );
}

function eventLabel(event: AdminAccessEvent) {
  return event.action.replaceAll("_", " ");
}

export default function AdminTeamAccessPanel({
  access,
  actionResult,
}: {
  access: AdminAccessSnapshot;
  actionResult: AccessActionResult;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(
    createAdminInvitationAction,
    initialInvitationState,
  );
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!inviteState.accessCode) return;
    await navigator.clipboard.writeText(inviteState.accessCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div id="admin-access" className="space-y-5 scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            Team and access security
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Private panel roles and invitations
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Owner-controlled access codes, masked identities, lockout protection
            and structured audit history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={access.operationsAllowed ? "positive" : "warning"}>
            {access.operationsAllowed ? "Owner controls enabled" : "Read-only access"}
          </Pill>
          <Pill tone="info">Manual secure codes</Pill>
        </div>
      </div>

      <ActionNotice result={actionResult} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Owners" value={access.counts.activeOwners} detail="Active platform owners." />
        <Metric label="Admins" value={access.counts.activeAdmins} detail="Operational administrators." />
        <Metric label="Analysts" value={access.counts.activeAnalysts} detail="Read-only analysis access." />
        <Metric label="Support" value={access.counts.activeSupport} detail="Read-only support access." />
        <Metric label="Disabled" value={access.counts.disabledMembers} detail="Blocked access grants." />
        <Metric label="Pending invites" value={access.counts.pendingInvitations} detail="Unexpired one-time codes." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Create team invitation</CardTitle>
            <CardDescription>
              The code is shown once; only its SHA-256 hash is stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {access.operationsAllowed ? (
              <form action={inviteAction} className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Intended email
                  </span>
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    autoComplete="off"
                    required
                    maxLength={254}
                    placeholder="admin@example.com"
                    disabled={invitePending}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Role</span>
                    <select className={inputClass} name="role" defaultValue="admin" disabled={invitePending}>
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="support">Support</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Expires</span>
                    <select className={inputClass} name="expiresInHours" defaultValue="72" disabled={invitePending}>
                      <option value="24">24 hours</option>
                      <option value="72">3 days</option>
                      <option value="168">7 days</option>
                    </select>
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={invitePending}>
                  {invitePending ? "Creating secure code…" : "Create one-time access code"}
                </Button>
              </form>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-6 text-sm text-muted-foreground">
                Only an active Owner can create or revoke invitations.
              </p>
            )}

            {inviteState.status !== "idle" && inviteState.status !== "created" ? (
              <p className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning">
                {inviteState.status === "forbidden"
                  ? "Owner access is required."
                  : inviteState.status === "invalid"
                    ? "Check the email, role and expiry."
                    : "The invitation was not created."}
              </p>
            ) : null}

            {inviteState.status === "created" && inviteState.accessCode ? (
              <div className="space-y-3 rounded-2xl border border-success/25 bg-success/5 p-4">
                <div>
                  <p className="font-semibold text-success">Copy this code now</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share it only with {inviteState.maskedEmail}. It cannot be recovered later.
                  </p>
                </div>
                <code className="block break-all rounded-xl border border-border/70 bg-background px-3 py-3 font-mono text-sm text-foreground">
                  {inviteState.accessCode}
                </code>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" onClick={copyCode}>
                    {copied ? "Copied" : "Copy code"}
                  </Button>
                  <span className="font-mono text-xs text-muted-foreground">
                    {inviteState.invitationCode}
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Security boundaries</CardTitle>
            <CardDescription>
              Authorization comes from private database grants, not editable user metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Raw invitation stored", access.rawInviteTokenStored ? "Yes" : "No"],
              ["User metadata authorization", access.userMetadataAuthorization ? "Yes" : "No"],
              ["Service role in browser", access.serviceRoleExposedToBrowser ? "Yes" : "No"],
              ["Invite delivery", "One-time manual code"],
              ["Self-disable", "Blocked"],
              ["Last-owner removal", "Blocked"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                <p className="mt-2 font-semibold text-foreground">{value}</p>
              </div>
            ))}
            <a
              href="/admin/claim"
              className="finance-focus rounded-2xl border border-info/25 bg-info/5 px-4 py-3 text-sm font-semibold text-info sm:col-span-2"
            >
              Open invitation acceptance page
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/88 shadow-sm">
        <CardHeader>
          <CardTitle>Panel members</CardTitle>
          <CardDescription>
            Only masked email labels and opaque member references are returned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-surface-secondary/70 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last access</th>
                  <th className="px-4 py-3 text-right font-semibold">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/70">
                {access.members.map((member) => (
                  <tr key={member.adminReference}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{member.maskedEmail}</p>
                      <code className="font-mono text-xs text-muted-foreground">{member.adminReference}</code>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{member.role}</td>
                    <td className="px-4 py-3">
                      <Pill tone={member.status === "active" ? "positive" : "danger"}>{member.status}</Pill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.lastAccessAt
                        ? `${formatAdminGeneratedAt(member.lastAccessAt)} UTC`
                        : "No recorded view"}
                    </td>
                    <td className="px-4 py-3">
                      {member.manageable ? (
                        <div className="flex justify-end gap-2">
                          <form action={updateAdminMemberAction} className="flex items-center gap-2">
                            <input type="hidden" name="adminReference" value={member.adminReference} />
                            <input type="hidden" name="action" value="set_role" />
                            <select className={cn(inputClass, "min-h-9 w-28 py-1")} name="role" defaultValue={member.role}>
                              {(["owner", "admin", "analyst", "support"] as PlatformAdminRole[]).map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" variant="outline">Save</Button>
                          </form>
                          <form action={updateAdminMemberAction}>
                            <input type="hidden" name="adminReference" value={member.adminReference} />
                            <input type="hidden" name="action" value={member.status === "active" ? "disable" : "restore"} />
                            <Button type="submit" size="sm" variant={member.status === "active" ? "destructive" : "outline"}>
                              {member.status === "active" ? "Disable" : "Restore"}
                            </Button>
                          </form>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-muted-foreground">
                          {member.isSelf ? "Current account protected" : "Read only"}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Expired codes become unusable automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {access.invitations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-7 text-center text-sm text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              access.invitations.map((invite) => (
                <div key={invite.invitationCode} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{invite.maskedEmail}</p>
                      <Pill tone={invite.status === "pending" ? "warning" : "danger"}>{invite.status}</Pill>
                      <Pill>{invite.role}</Pill>
                    </div>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {invite.invitationCode} · expires {formatAdminGeneratedAt(invite.expiresAt)} UTC
                    </p>
                  </div>
                  {invite.manageable ? (
                    <form action={revokeAdminInvitationAction}>
                      <input type="hidden" name="invitationCode" value={invite.invitationCode} />
                      <Button type="submit" size="sm" variant="destructive">Revoke</Button>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/88 shadow-sm">
          <CardHeader>
            <CardTitle>Recent access audit</CardTitle>
            <CardDescription>Structured events only; no raw identities, tokens or notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {access.recentEvents.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/80 bg-surface-secondary/35 px-4 py-7 text-center text-sm text-muted-foreground">
                No team-access events recorded.
              </p>
            ) : (
              access.recentEvents.map((event) => (
                <div key={event.eventReference} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold capitalize text-foreground">{eventLabel(event)}</p>
                    <code className="font-mono text-xs text-muted-foreground">{event.eventReference}</code>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Actor {event.actorReference}
                    {event.subjectReference ? ` · Member ${event.subjectReference}` : ""}
                    {event.invitationCode ? ` · Invite ${event.invitationCode}` : ""}
                    {event.previousRole || event.nextRole
                      ? ` · ${event.previousRole ?? "none"} → ${event.nextRole ?? "none"}`
                      : ""}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {formatAdminGeneratedAt(event.createdAt)} UTC
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
