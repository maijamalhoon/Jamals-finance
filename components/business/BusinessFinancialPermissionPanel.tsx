"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ClipboardCheck, FileArchive, Landmark, MapPinned, Save, ShieldCheck, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type FinancialMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "revoked";
  permissions: string[];
  is_primary_owner: boolean;
};

type Props = {
  businessId: string;
  currentUserId: string;
  canManage: boolean;
  members: FinancialMember[];
  permissionCatalog: string[];
};

const PROTECTED_PERMISSIONS = [
  { value: "banking.view", label: "View banking", icon: Landmark },
  { value: "banking.manage", label: "Manage reconciliation", icon: Landmark },
  { value: "budget.view", label: "View budgets", icon: TrendingUp },
  { value: "budget.manage", label: "Manage draft plans", icon: TrendingUp },
  { value: "budget.approve", label: "Approve and lock", icon: BadgeCheck },
  { value: "documents.view", label: "View records", icon: FileArchive },
  { value: "documents.manage", label: "Manage records", icon: FileArchive },
  { value: "branches.view", label: "View branches", icon: MapPinned },
  { value: "branches.manage", label: "Manage branch scope", icon: MapPinned },
  { value: "approvals.view", label: "View approvals", icon: ClipboardCheck },
  { value: "approvals.request", label: "Request approval", icon: ClipboardCheck },
  { value: "approvals.decide", label: "Approve or reject", icon: BadgeCheck },
  { value: "approvals.manage", label: "Manage controls", icon: ClipboardCheck },
] as const;

export default function BusinessFinancialPermissionPanel({
  businessId,
  currentUserId,
  canManage,
  members,
  permissionCatalog,
}: Props) {
  if (!canManage) return null;

  const editableMembers = members.filter((member) => !member.is_primary_owner && member.status !== "revoked");

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-text-primary sm:text-lg">Protected workspace access</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Banking, planning, company-record, branch, and approval permissions are tenant-scoped. Saving here preserves every unrelated CRM, sales, inventory, shop, and team permission.
          </p>
        </div>
      </div>

      {editableMembers.length ? (
        <div className="mt-5 space-y-3">
          {editableMembers.map((member) => (
            <ProtectedMemberRow
              key={member.user_id}
              businessId={businessId}
              currentUserId={currentUserId}
              member={member}
              permissionCatalog={permissionCatalog}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
          Add another team member to configure Banking, Budgeting, Documents, Branches, or Approvals access.
        </div>
      )}
    </section>
  );
}

function ProtectedMemberRow({
  businessId,
  currentUserId,
  member,
  permissionCatalog,
}: {
  businessId: string;
  currentUserId: string;
  member: FinancialMember;
  permissionCatalog: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [permissions, setPermissions] = useState(member.permissions);
  const [saving, setSaving] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const hasWildcard = permissions.includes("*");

  useEffect(() => {
    setPermissions(member.permissions);
  }, [member.permissions]);

  function toggle(permission: string) {
    if (hasWildcard || !permissionCatalog.includes(permission)) return;
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((value) => value !== permission)
        : [...current, permission],
    );
  }

  async function save() {
    if (saving || hasWildcard) return;
    setSaving(true);
    const { error } = await supabase.rpc("update_business_team_member", {
      p_business_id: businessId,
      p_user_id: member.user_id,
      p_role: member.role,
      p_status: member.status,
      p_permissions: permissions,
    });
    setSaving(false);

    if (error) {
      console.error("Protected team permissions update failed", { code: error.code });
      toast.error(error.code === "42501" ? "The primary owner must approve this protected access change." : "Protected workspace access could not be updated.");
      return;
    }

    toast.success("Protected access updated without changing other permissions.");
    router.refresh();
  }

  return (
    <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-text-primary">{member.name}</strong>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-text-secondary">{member.role.replace(/_/g, " ")}</span>
            {isSelf ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-black text-primary">You</span> : null}
            {hasWildcard ? <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-black text-success">Full access</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-text-secondary">{member.email ?? member.user_id}</p>
        </div>

        <div className="flex flex-1 flex-wrap gap-2 xl:justify-end">
          {PROTECTED_PERMISSIONS.map(({ value, label, icon: Icon }) => {
            const available = permissionCatalog.includes(value);
            const checked = hasWildcard || permissions.includes(value);
            return (
              <label
                key={value}
                className={`flex min-h-9 items-center gap-2 rounded-[var(--radius-button)] px-3 text-xs font-bold transition-colors ${
                  checked ? "bg-primary-soft text-primary" : "bg-surface text-text-secondary"
                } ${available && !hasWildcard ? "cursor-pointer" : "opacity-40"}`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-current"
                  checked={checked}
                  disabled={!available || saving || hasWildcard}
                  onChange={() => toggle(value)}
                />
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </label>
            );
          })}
          <Button type="button" size="sm" disabled={hasWildcard} loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
            <Save aria-hidden="true" /> Save
          </Button>
        </div>
      </div>
    </article>
  );
}
