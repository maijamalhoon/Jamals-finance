"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Crown,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "@/components/icons/jalvoro/compat";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type BranchType = "head_office" | "branch" | "store" | "office" | "site";
type BranchStatus = "active" | "inactive";
type AccessMode = "all" | "selected";

type Branch = {
  id: string;
  code: string;
  name: string;
  branch_type: BranchType;
  status: BranchStatus;
  is_primary: boolean;
  country_code: string | null;
  city: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  manager_user_id: string | null;
  manager_name: string | null;
  assigned_member_count: number;
  current_user_has_access: boolean;
  created_at: string;
  updated_at: string;
};

type BranchMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "revoked";
  branch_access_mode: AccessMode;
  branch_ids: string[];
  is_primary_owner: boolean;
};

type BranchAudit = {
  id: number | string;
  branch_id: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  target_user_id: string | null;
  target_name: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BranchesSnapshot = {
  can_manage: boolean;
  current_user_access_mode: AccessMode;
  summary: {
    total_branches: number;
    active_branches: number;
    selected_scope_members: number;
    primary_branch_id: string | null;
  };
  branches: Branch[];
  members: BranchMember[];
  audit: BranchAudit[];
};

type Props = {
  businessId: string;
  businessName: string;
  businessTimezone: string;
  businessCountryCode: string | null;
  snapshot: BranchesSnapshot;
};

type BranchDraft = {
  name: string;
  code: string;
  branchType: BranchType;
  status: BranchStatus;
  isPrimary: boolean;
  countryCode: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  timezone: string;
  phone: string;
  email: string;
  managerUserId: string;
};

const inputClass =
  "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";

function emptyDraft(timezone: string, countryCode: string | null): BranchDraft {
  return {
    name: "",
    code: "",
    branchType: "branch",
    status: "active",
    isPrimary: false,
    countryCode: countryCode ?? "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    timezone,
    phone: "",
    email: "",
    managerUserId: "",
  };
}

function draftFromBranch(branch: Branch): BranchDraft {
  return {
    name: branch.name,
    code: branch.code,
    branchType: branch.branch_type,
    status: branch.status,
    isPrimary: branch.is_primary,
    countryCode: branch.country_code ?? "",
    city: branch.city ?? "",
    addressLine1: branch.address_line_1 ?? "",
    addressLine2: branch.address_line_2 ?? "",
    postalCode: branch.postal_code ?? "",
    timezone: branch.timezone,
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    managerUserId: branch.manager_user_id ?? "",
  };
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(code?: string, message?: string) {
  if (code === "42501") return "The primary owner or a branch administrator must approve this change.";
  if (code === "23505") return "That branch code is already in use.";
  if (code === "55000") return message || "The primary branch cannot be changed that way.";
  if (code === "22023") return message || "Check the branch information and try again.";
  return "The branch change could not be saved.";
}

export default function BusinessBranchesWorkspace({
  businessId,
  businessName,
  businessTimezone,
  businessCountryCode,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState<BranchDraft>(() => emptyDraft(businessTimezone, businessCountryCode));
  const [savingBranch, setSavingBranch] = useState(false);

  const activeMembers = snapshot.members.filter((member) => member.status === "active");
  const primaryBranch = snapshot.branches.find((branch) => branch.is_primary) ?? null;

  function startCreate() {
    setEditingBranch(null);
    setDraft(emptyDraft(businessTimezone, businessCountryCode));
    setShowEditor(true);
  }

  function startEdit(branch: Branch) {
    setEditingBranch(branch);
    setDraft(draftFromBranch(branch));
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingBranch(null);
    setDraft(emptyDraft(businessTimezone, businessCountryCode));
  }

  async function saveBranch() {
    if (savingBranch) return;
    if (draft.name.trim().length < 2 || draft.code.trim().length < 2) {
      toast.error("Enter a branch name and a short unique code.");
      return;
    }

    setSavingBranch(true);
    const commonParams = {
      p_business_id: businessId,
      p_name: draft.name,
      p_code: draft.code.toUpperCase(),
      p_branch_type: draft.branchType,
      p_is_primary: draft.isPrimary,
      p_country_code: draft.countryCode || null,
      p_city: draft.city || null,
      p_address_line_1: draft.addressLine1 || null,
      p_address_line_2: draft.addressLine2 || null,
      p_postal_code: draft.postalCode || null,
      p_timezone: draft.timezone,
      p_phone: draft.phone || null,
      p_email: draft.email || null,
      p_manager_user_id: draft.managerUserId || null,
    };

    const result = editingBranch
      ? await supabase.rpc("update_business_branch", {
          ...commonParams,
          p_branch_id: editingBranch.id,
          p_status: draft.status,
        })
      : await supabase.rpc("create_business_branch", commonParams);

    setSavingBranch(false);
    if (result.error) {
      console.error("Business branch save failed", { code: result.error.code });
      toast.error(errorMessage(result.error.code, result.error.message));
      return;
    }

    toast.success(editingBranch ? "Branch updated." : "Branch created.");
    closeEditor();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="All branches" value={String(snapshot.summary.total_branches)} />
        <MetricCard icon={CheckCircle2} label="Active locations" value={String(snapshot.summary.active_branches)} />
        <MetricCard icon={UsersRound} label="Selected-scope members" value={String(snapshot.summary.selected_scope_members)} />
        <MetricCard icon={Crown} label="Primary branch" value={primaryBranch?.name ?? "Not created"} />
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <MapPinned className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-text-primary sm:text-lg">Company locations</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
                Branches are operational locations. Warehouses remain inventory storage points and are not duplicated here.
              </p>
            </div>
          </div>
          {snapshot.can_manage ? (
            <Button type="button" size="sm" onClick={startCreate}>
              <Plus aria-hidden="true" /> Add branch
            </Button>
          ) : null}
        </div>

        {showEditor ? (
          <div className="mt-6 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                  {editingBranch ? "Edit location" : "New location"}
                </p>
                <h3 className="mt-1 font-black text-text-primary">
                  {editingBranch ? editingBranch.name : `Add a branch to ${businessName}`}
                </h3>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close branch form" onClick={closeEditor}>
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Branch name">
                <input
                  className={inputClass}
                  value={draft.name}
                  maxLength={120}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Clifton Store"
                />
              </Field>
              <Field label="Unique code">
                <input
                  className={inputClass}
                  value={draft.code}
                  maxLength={20}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                    }))
                  }
                  placeholder="KHI-01"
                />
              </Field>
              <Field label="Location type">
                <select
                  className={inputClass}
                  value={draft.branchType}
                  onChange={(event) => setDraft((current) => ({ ...current, branchType: event.target.value as BranchType }))}
                >
                  <option value="head_office">Head office</option>
                  <option value="branch">Branch</option>
                  <option value="store">Store</option>
                  <option value="office">Office</option>
                  <option value="site">Project site</option>
                </select>
              </Field>
              {editingBranch ? (
                <Field label="Status">
                  <select
                    className={inputClass}
                    value={draft.status}
                    disabled={editingBranch.is_primary}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as BranchStatus }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Country code">
                <input
                  className={inputClass}
                  value={draft.countryCode}
                  maxLength={2}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, countryCode: event.target.value.toUpperCase().replace(/[^A-Z]/g, "") }))
                  }
                  placeholder="PK"
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={draft.city}
                  maxLength={100}
                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Karachi"
                />
              </Field>
              <Field label="Timezone">
                <input
                  className={inputClass}
                  value={draft.timezone}
                  maxLength={80}
                  onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}
                  placeholder="Asia/Karachi"
                />
              </Field>
              <Field label="Address line 1">
                <input
                  className={inputClass}
                  value={draft.addressLine1}
                  maxLength={180}
                  onChange={(event) => setDraft((current) => ({ ...current, addressLine1: event.target.value }))}
                  placeholder="Street and building"
                />
              </Field>
              <Field label="Address line 2">
                <input
                  className={inputClass}
                  value={draft.addressLine2}
                  maxLength={180}
                  onChange={(event) => setDraft((current) => ({ ...current, addressLine2: event.target.value }))}
                  placeholder="Area or floor"
                />
              </Field>
              <Field label="Postal code">
                <input
                  className={inputClass}
                  value={draft.postalCode}
                  maxLength={24}
                  onChange={(event) => setDraft((current) => ({ ...current, postalCode: event.target.value }))}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={draft.phone}
                  maxLength={40}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                />
              </Field>
              <Field label="Email">
                <input
                  className={inputClass}
                  value={draft.email}
                  type="email"
                  maxLength={254}
                  onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </Field>
              <Field label="Branch manager">
                <select
                  className={inputClass}
                  value={draft.managerUserId}
                  onChange={(event) => setDraft((current) => ({ ...current, managerUserId: event.target.value }))}
                >
                  <option value="">No manager assigned</option>
                  {activeMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name} · {formatLabel(member.role)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[var(--radius-button)] bg-surface px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-current"
                checked={draft.isPrimary}
                disabled={editingBranch?.is_primary === true}
                onChange={(event) => setDraft((current) => ({ ...current, isPrimary: event.target.checked }))}
              />
              <span>
                <strong className="block text-text-primary">Make this the primary branch</strong>
                <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
                  Setting a new primary branch automatically replaces the previous primary. The primary location must stay active.
                </span>
              </span>
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeEditor}>Cancel</Button>
              <Button type="button" loading={savingBranch} loadingLabel="Saving…" onClick={() => void saveBranch()}>
                <Save aria-hidden="true" /> {editingBranch ? "Save branch" : "Create branch"}
              </Button>
            </div>
          </div>
        ) : null}

        {snapshot.branches.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.branches.map((branch) => (
              <article key={branch.id} className="rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] ${branch.status === "active" ? "bg-primary-soft text-primary" : "bg-surface text-text-tertiary"}`}>
                    <MapPin className="size-5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {branch.is_primary ? <Badge label="Primary" tone="success" /> : null}
                    <Badge label={formatLabel(branch.status)} tone={branch.status === "active" ? "primary" : "neutral"} />
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{branch.code}</p>
                    <h3 className="mt-1 truncate text-base font-black text-text-primary">{branch.name}</h3>
                    <p className="mt-1 text-xs text-text-secondary">{formatLabel(branch.branch_type)}</p>
                  </div>
                  {snapshot.can_manage ? (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${branch.name}`} onClick={() => startEdit(branch)}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-2 text-sm text-text-secondary">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{[branch.address_line_1, branch.city, branch.country_code].filter(Boolean).join(", ") || "Address not set"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3 className="size-4 shrink-0" aria-hidden="true" /> {branch.timezone}
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRoundCog className="size-4 shrink-0" aria-hidden="true" /> {branch.manager_name ?? "No branch manager"}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-xs text-text-secondary">
                  <span>{branch.assigned_member_count} selected-scope members</span>
                  <span>{branch.current_user_has_access ? "You have access" : "Restricted"}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-10 text-center">
            <MapPinned className="mx-auto size-7 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-black text-text-primary">Create the first company location</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              The first branch automatically becomes primary. Existing accounting, sales, and inventory behavior remains unchanged until branch-aware workflows are enabled later.
            </p>
            {snapshot.can_manage ? (
              <Button type="button" className="mt-4" onClick={startCreate}>
                <Plus aria-hidden="true" /> Create first branch
              </Button>
            ) : null}
          </div>
        )}
      </section>

      {snapshot.can_manage ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-text-primary sm:text-lg">Member branch scope</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
                Existing members keep all-branch access. Restrict a member only when their work should be limited to selected locations.
              </p>
            </div>
          </div>

          {snapshot.members.length ? (
            <div className="mt-5 space-y-3">
              {snapshot.members.map((member) => (
                <MemberScopeRow
                  key={member.user_id}
                  businessId={businessId}
                  member={member}
                  branches={snapshot.branches.filter((branch) => branch.status === "active")}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              Add team members before assigning branch scope.
            </div>
          )}
        </section>
      ) : null}

      {snapshot.can_manage ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-black text-text-primary sm:text-lg">Location audit trail</h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">Branch and member-scope changes are recorded with the acting team member.</p>
            </div>
          </div>
          {snapshot.audit.length ? (
            <div className="mt-5 divide-y divide-border/70">
              {snapshot.audit.slice(0, 12).map((event) => (
                <div key={String(event.id)} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary">
                      {event.actor_name ?? "Team member"} · {formatLabel(event.action)}
                    </p>
                    {event.target_name ? <p className="mt-0.5 truncate text-xs text-text-secondary">Member: {event.target_name}</p> : null}
                  </div>
                  <time className="shrink-0 text-xs text-text-secondary" dateTime={event.created_at}>{formatDate(event.created_at)}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-5 text-sm text-text-secondary">No branch changes have been recorded yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function MemberScopeRow({
  businessId,
  member,
  branches,
}: {
  businessId: string;
  member: BranchMember;
  branches: Branch[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<AccessMode>(member.branch_access_mode);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(member.branch_ids));
  const [saving, setSaving] = useState(false);
  const ownerLocked = member.is_primary_owner;

  function toggle(branchId: string) {
    if (ownerLocked || mode !== "selected") return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }

  async function save() {
    if (saving || ownerLocked) return;
    if (mode === "selected" && selected.size === 0) {
      toast.error("Select at least one active branch for this member.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("set_business_member_branch_scope", {
      p_business_id: businessId,
      p_user_id: member.user_id,
      p_access_mode: mode,
      p_branch_ids: mode === "selected" ? Array.from(selected) : [],
    });
    setSaving(false);

    if (error) {
      console.error("Member branch scope update failed", { code: error.code });
      toast.error(errorMessage(error.code, error.message));
      return;
    }

    toast.success("Member branch scope updated.");
    router.refresh();
  }

  return (
    <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:w-72">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-text-primary">{member.name}</strong>
            <Badge label={formatLabel(member.role)} tone="neutral" />
            {ownerLocked ? <Badge label="All branches locked" tone="success" /> : null}
          </div>
          <p className="mt-1 truncate text-xs text-text-secondary">{member.email ?? member.user_id}</p>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            {(["all", "selected"] as AccessMode[]).map((value) => (
              <label key={value} className={`flex min-h-9 items-center gap-2 rounded-[var(--radius-button)] px-3 text-xs font-bold ${mode === value ? "bg-primary-soft text-primary" : "bg-surface text-text-secondary"} ${ownerLocked ? "opacity-50" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name={`branch-mode-${member.user_id}`}
                  value={value}
                  checked={mode === value}
                  disabled={ownerLocked || saving}
                  onChange={() => setMode(value)}
                />
                {value === "all" ? "All branches" : "Selected branches"}
              </label>
            ))}
          </div>

          {mode === "selected" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {branches.map((branch) => {
                const checked = selected.has(branch.id);
                return (
                  <label key={branch.id} className={`flex min-h-9 items-center gap-2 rounded-[var(--radius-button)] px-3 text-xs font-bold ${checked ? "bg-primary-soft text-primary" : "bg-surface text-text-secondary"} ${ownerLocked ? "opacity-50" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      className="size-4 accent-current"
                      checked={checked}
                      disabled={ownerLocked || saving}
                      onChange={() => toggle(branch.id)}
                    />
                    {branch.code} · {branch.name}
                  </label>
                );
              })}
              {!branches.length ? <span className="text-xs text-text-secondary">Create an active branch first.</span> : null}
            </div>
          ) : null}
        </div>

        <Button type="button" size="sm" disabled={ownerLocked} loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
          <Save aria-hidden="true" /> Save scope
        </Button>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-4 text-xs font-bold text-text-secondary">{label}</p>
      <strong className="mt-1 block truncate text-xl font-black text-text-primary">{value}</strong>
    </article>
  );
}

function Badge({ label, tone }: { label: string; tone: "primary" | "success" | "neutral" }) {
  const className =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "primary"
        ? "bg-primary-soft text-primary"
        : "bg-surface text-text-secondary";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${className}`}>{label}</span>;
}
