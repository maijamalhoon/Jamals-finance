"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export type ApprovalPolicy = {
  id: string;
  code: string;
  name: string;
  module_key: string;
  action_key: string;
  description: string | null;
  branch_id: string | null;
  branch_name: string | null;
  min_amount: number | null;
  max_amount: number | null;
  currency: string | null;
  required_approvals: number;
  approver_permission: string;
  approver_user_id: string | null;
  approver_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApprovalRequest = {
  id: string;
  request_no: number;
  request_code: string;
  policy_id: string | null;
  policy_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  module_key: string;
  action_key: string;
  subject_type: string;
  subject_key: string;
  subject_label: string;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_by: string | null;
  requester_name: string;
  assigned_to: string | null;
  assigned_name: string | null;
  required_permission: string;
  required_approvals: number;
  approval_count: number;
  rejection_count: number;
  payload: Record<string, unknown>;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalDecision = {
  id: number | string;
  request_id: string;
  request_code: string;
  actor_user_id: string | null;
  actor_name: string;
  decision: "approved" | "rejected" | "commented";
  comment: string | null;
  created_at: string;
};

export type ApprovalMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  permissions: string[];
  branch_access_mode: "all" | "selected";
};

export type ApprovalBranch = {
  id: string;
  code: string;
  name: string;
  is_primary: boolean;
};

export type ApprovalAudit = {
  id: number | string;
  request_id: string | null;
  policy_id: string | null;
  actor_user_id: string | null;
  actor_name: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ApprovalsSnapshot = {
  summary: {
    pending: number;
    approved: number;
    rejected: number;
    urgent: number;
    unassigned: number;
  };
  policies: ApprovalPolicy[];
  requests: ApprovalRequest[];
  decisions: ApprovalDecision[];
  members: ApprovalMember[];
  branches: ApprovalBranch[];
  audit: ApprovalAudit[];
  capabilities: {
    can_view_all: boolean;
    can_request: boolean;
    can_decide: boolean;
    can_manage: boolean;
  };
};

type Props = {
  businessId: string;
  currentUserId: string;
  baseCurrency: string;
  snapshot: ApprovalsSnapshot;
};

type RequestDraft = {
  moduleKey: string;
  actionKey: string;
  subjectType: string;
  subjectKey: string;
  subjectLabel: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  priority: ApprovalRequest["priority"];
  branchId: string;
  policyId: string;
  assignedTo: string;
};

type PolicyDraft = {
  id: string;
  code: string;
  name: string;
  moduleKey: string;
  actionKey: string;
  description: string;
  branchId: string;
  minAmount: string;
  maxAmount: string;
  currency: string;
  requiredApprovals: string;
  approverUserId: string;
};

const emptyRequestDraft = (currency: string): RequestDraft => ({
  moduleKey: "purchases",
  actionKey: "post_bill",
  subjectType: "manual",
  subjectKey: "",
  subjectLabel: "",
  title: "",
  description: "",
  amount: "",
  currency,
  priority: "normal",
  branchId: "",
  policyId: "",
  assignedTo: "",
});

const emptyPolicyDraft = (currency: string): PolicyDraft => ({
  id: "",
  code: "",
  name: "",
  moduleKey: "purchases",
  actionKey: "post_bill",
  description: "",
  branchId: "",
  minAmount: "",
  maxAmount: "",
  currency,
  requiredApprovals: "1",
  approverUserId: "",
});

const inputClass =
  "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";
const labelClass = "text-xs font-black text-text-secondary";

function formatLabel(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null) return "No amount";
  return `${currency ?? ""} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)}`.trim();
}

function statusClasses(status: ApprovalRequest["status"]) {
  if (status === "approved") return "bg-success-soft text-success";
  if (status === "rejected") return "bg-danger-soft text-danger";
  if (status === "cancelled") return "bg-surface-secondary text-text-secondary";
  return "bg-warning-soft text-warning";
}

function priorityClasses(priority: ApprovalRequest["priority"]) {
  if (priority === "urgent") return "bg-danger-soft text-danger";
  if (priority === "high") return "bg-warning-soft text-warning";
  return "bg-surface-secondary text-text-secondary";
}

export default function BusinessApprovalsWorkspace({
  businessId,
  currentUserId,
  baseCurrency,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [requestOpen, setRequestOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [requestDraft, setRequestDraft] = useState<RequestDraft>(() => emptyRequestDraft(baseCurrency));
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>(() => emptyPolicyDraft(baseCurrency));
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalRequest["status"]>("pending");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const filteredRequests = snapshot.requests.filter((request) =>
    statusFilter === "all" ? true : request.status === statusFilter,
  );

  const decisionsByRequest = useMemo(() => {
    return snapshot.decisions.reduce<Record<string, ApprovalDecision[]>>((grouped, decision) => {
      grouped[decision.request_id] ??= [];
      grouped[decision.request_id].push(decision);
      return grouped;
    }, {});
  }, [snapshot.decisions]);

  async function createRequest() {
    if (!requestDraft.subjectLabel.trim() || !requestDraft.title.trim()) {
      toast.error("Subject and request title are required.");
      return;
    }

    const key = "create-request";
    setBusyKey(key);
    const { error } = await supabase.rpc("create_business_approval_request", {
      p_business_id: businessId,
      p_module_key: requestDraft.moduleKey,
      p_action_key: requestDraft.actionKey,
      p_subject_type: requestDraft.subjectType,
      p_subject_key: requestDraft.subjectKey.trim() || `manual-${crypto.randomUUID()}`,
      p_subject_label: requestDraft.subjectLabel.trim(),
      p_title: requestDraft.title.trim(),
      p_description: requestDraft.description.trim() || null,
      p_amount: requestDraft.amount ? Number(requestDraft.amount) : null,
      p_currency: requestDraft.amount ? requestDraft.currency.toUpperCase() : null,
      p_priority: requestDraft.priority,
      p_branch_id: requestDraft.branchId || null,
      p_policy_id: requestDraft.policyId || null,
      p_assigned_to: snapshot.capabilities.can_manage ? requestDraft.assignedTo || null : null,
      p_payload: { source: "approval_workspace" },
      p_client_request_id: crypto.randomUUID(),
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval request creation failed", { code: error.code });
      toast.error(
        error.code === "23505"
          ? "An open request already exists for this subject and action."
          : error.code === "42501"
            ? "Your role or branch scope does not allow this request."
            : "Approval request could not be created.",
      );
      return;
    }

    toast.success("Approval request created.");
    setRequestDraft(emptyRequestDraft(baseCurrency));
    setRequestOpen(false);
    router.refresh();
  }

  async function savePolicy() {
    if (!policyDraft.code.trim() || !policyDraft.name.trim()) {
      toast.error("Policy code and name are required.");
      return;
    }

    const key = "save-policy";
    setBusyKey(key);
    const { error } = await supabase.rpc("upsert_business_approval_policy", {
      p_business_id: businessId,
      p_policy_id: policyDraft.id || null,
      p_code: policyDraft.code.trim().toUpperCase(),
      p_name: policyDraft.name.trim(),
      p_module_key: policyDraft.moduleKey,
      p_action_key: policyDraft.actionKey,
      p_description: policyDraft.description.trim() || null,
      p_branch_id: policyDraft.branchId || null,
      p_min_amount: policyDraft.minAmount ? Number(policyDraft.minAmount) : null,
      p_max_amount: policyDraft.maxAmount ? Number(policyDraft.maxAmount) : null,
      p_currency: policyDraft.currency.trim().toUpperCase() || null,
      p_required_approvals: Number(policyDraft.requiredApprovals),
      p_approver_permission: "approvals.decide",
      p_approver_user_id: policyDraft.approverUserId || null,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval policy save failed", { code: error.code });
      toast.error(error.code === "42501" ? "Approval management permission is required." : "Policy could not be saved.");
      return;
    }

    toast.success(policyDraft.id ? "Approval policy updated." : "Approval policy created.");
    setPolicyDraft(emptyPolicyDraft(baseCurrency));
    setPolicyOpen(false);
    router.refresh();
  }

  async function setPolicyStatus(policy: ApprovalPolicy) {
    const key = `policy-status-${policy.id}`;
    setBusyKey(key);
    const { error } = await supabase.rpc("set_business_approval_policy_status", {
      p_business_id: businessId,
      p_policy_id: policy.id,
      p_active: !policy.active,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval policy status failed", { code: error.code });
      toast.error("Policy status could not be changed.");
      return;
    }

    toast.success(policy.active ? "Policy deactivated." : "Policy activated.");
    router.refresh();
  }

  function editPolicy(policy: ApprovalPolicy) {
    setPolicyDraft({
      id: policy.id,
      code: policy.code,
      name: policy.name,
      moduleKey: policy.module_key,
      actionKey: policy.action_key,
      description: policy.description ?? "",
      branchId: policy.branch_id ?? "",
      minAmount: policy.min_amount?.toString() ?? "",
      maxAmount: policy.max_amount?.toString() ?? "",
      currency: policy.currency ?? baseCurrency,
      requiredApprovals: policy.required_approvals.toString(),
      approverUserId: policy.approver_user_id ?? "",
    });
    setPolicyOpen(true);
  }

  async function decide(request: ApprovalRequest, decision: "approved" | "rejected") {
    const comment = comments[request.id]?.trim() ?? "";
    if (decision === "rejected" && !comment) {
      toast.error("Add a rejection reason first.");
      return;
    }

    const key = `${decision}-${request.id}`;
    setBusyKey(key);
    const { error } = await supabase.rpc("decide_business_approval_request", {
      p_business_id: businessId,
      p_request_id: request.id,
      p_decision: decision,
      p_comment: comment || null,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval decision failed", { code: error.code });
      toast.error(
        error.code === "42501"
          ? "You cannot decide this request. Requesters cannot approve themselves, and branch scope is enforced."
          : error.code === "23505"
            ? "You already decided this request."
            : "Decision could not be recorded.",
      );
      return;
    }

    toast.success(decision === "approved" ? "Approval recorded." : "Request rejected.");
    setComments((current) => ({ ...current, [request.id]: "" }));
    router.refresh();
  }

  async function addComment(request: ApprovalRequest) {
    const comment = comments[request.id]?.trim() ?? "";
    if (!comment) {
      toast.error("Write a comment first.");
      return;
    }

    const key = `comment-${request.id}`;
    setBusyKey(key);
    const { error } = await supabase.rpc("comment_business_approval_request", {
      p_business_id: businessId,
      p_request_id: request.id,
      p_comment: comment,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval comment failed", { code: error.code });
      toast.error("Comment could not be added.");
      return;
    }

    toast.success("Comment added.");
    setComments((current) => ({ ...current, [request.id]: "" }));
    router.refresh();
  }

  async function cancelRequest(request: ApprovalRequest) {
    const key = `cancel-${request.id}`;
    setBusyKey(key);
    const { error } = await supabase.rpc("cancel_business_approval_request", {
      p_business_id: businessId,
      p_request_id: request.id,
      p_comment: comments[request.id]?.trim() || null,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval cancellation failed", { code: error.code });
      toast.error(error.code === "42501" ? "Only the requester or an approval manager can cancel this request." : "Request could not be cancelled.");
      return;
    }

    toast.success("Request cancelled.");
    router.refresh();
  }

  async function assignRequest(request: ApprovalRequest) {
    const assignedTo = assignments[request.id] ?? request.assigned_to ?? "";
    if (!assignedTo) {
      toast.error("Choose an approver.");
      return;
    }

    const key = `assign-${request.id}`;
    setBusyKey(key);
    const { error } = await supabase.rpc("assign_business_approval_request", {
      p_business_id: businessId,
      p_request_id: request.id,
      p_assigned_to: assignedTo,
    });
    setBusyKey(null);

    if (error) {
      console.error("Approval assignment failed", { code: error.code });
      toast.error(error.code === "42501" ? "The selected member cannot approve this request or branch." : "Request could not be assigned.");
      return;
    }

    toast.success("Approver assigned.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Clock3} label="Pending" value={snapshot.summary.pending} />
        <MetricCard icon={BadgeCheck} label="Approved" value={snapshot.summary.approved} />
        <MetricCard icon={Ban} label="Rejected" value={snapshot.summary.rejected} />
        <MetricCard icon={CircleAlert} label="Urgent" value={snapshot.summary.urgent} />
        <MetricCard icon={UserRoundCheck} label="Unassigned" value={snapshot.summary.unassigned} />
      </section>

      <section className="rounded-[var(--radius-card)] bg-primary-soft px-5 py-5 text-primary sm:px-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-black">Maker–checker control is active</h2>
            <p className="mt-1 text-sm leading-6 opacity-80">
              Approval records authorize and document a decision. They do not post journals, move stock, pay suppliers, or execute another module action unless that module is explicitly integrated with this approval request.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {snapshot.capabilities.can_request ? (
          <Button type="button" onClick={() => setRequestOpen((open) => !open)}>
            {requestOpen ? <X aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
            {requestOpen ? "Close request form" : "New approval request"}
          </Button>
        ) : null}
        {snapshot.capabilities.can_manage ? (
          <Button type="button" variant="outline" onClick={() => setPolicyOpen((open) => !open)}>
            {policyOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {policyOpen ? "Close policy form" : "New approval policy"}
          </Button>
        ) : null}
      </div>

      {requestOpen ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
          <SectionTitle icon={FilePlus2} title="Create approval request" description="Use a stable subject key from the source record when available. The system blocks a second pending request for the same subject and action." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Module">
              <input className={inputClass} value={requestDraft.moduleKey} onChange={(event) => setRequestDraft({ ...requestDraft, moduleKey: event.target.value.toLowerCase() })} placeholder="purchases" />
            </Field>
            <Field label="Action">
              <input className={inputClass} value={requestDraft.actionKey} onChange={(event) => setRequestDraft({ ...requestDraft, actionKey: event.target.value.toLowerCase() })} placeholder="post_bill" />
            </Field>
            <Field label="Subject type">
              <input className={inputClass} value={requestDraft.subjectType} onChange={(event) => setRequestDraft({ ...requestDraft, subjectType: event.target.value.toLowerCase() })} placeholder="supplier_bill" />
            </Field>
            <Field label="Subject key">
              <input className={inputClass} value={requestDraft.subjectKey} onChange={(event) => setRequestDraft({ ...requestDraft, subjectKey: event.target.value })} placeholder="BILL-00042" />
            </Field>
            <Field label="Subject label">
              <input className={inputClass} value={requestDraft.subjectLabel} onChange={(event) => setRequestDraft({ ...requestDraft, subjectLabel: event.target.value })} placeholder="Supplier bill BILL-00042" />
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={requestDraft.priority} onChange={(event) => setRequestDraft({ ...requestDraft, priority: event.target.value as ApprovalRequest["priority"] })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Branch">
              <select className={inputClass} value={requestDraft.branchId} onChange={(event) => setRequestDraft({ ...requestDraft, branchId: event.target.value })}>
                <option value="">All / no branch</option>
                {snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
              </select>
            </Field>
            <Field label="Policy">
              <select className={inputClass} value={requestDraft.policyId} onChange={(event) => setRequestDraft({ ...requestDraft, policyId: event.target.value })}>
                <option value="">Auto-match active policy</option>
                {snapshot.policies.filter((policy) => policy.active).map((policy) => <option key={policy.id} value={policy.id}>{policy.code} · {policy.name}</option>)}
              </select>
            </Field>
            {snapshot.capabilities.can_manage ? (
              <Field label="Assign approver">
                <select className={inputClass} value={requestDraft.assignedTo} onChange={(event) => setRequestDraft({ ...requestDraft, assignedTo: event.target.value })}>
                  <option value="">Policy / open queue</option>
                  {snapshot.members.filter((member) => member.user_id !== currentUserId).map((member) => <option key={member.user_id} value={member.user_id}>{member.name} · {formatLabel(member.role)}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Amount">
              <input className={inputClass} type="number" min="0" step="0.01" value={requestDraft.amount} onChange={(event) => setRequestDraft({ ...requestDraft, amount: event.target.value })} placeholder="0.00" />
            </Field>
            <Field label="Currency">
              <input className={inputClass} maxLength={3} value={requestDraft.currency} onChange={(event) => setRequestDraft({ ...requestDraft, currency: event.target.value.toUpperCase() })} />
            </Field>
            <Field label="Title" className="md:col-span-2 xl:col-span-3">
              <input className={inputClass} value={requestDraft.title} onChange={(event) => setRequestDraft({ ...requestDraft, title: event.target.value })} placeholder="Approve supplier bill posting" />
            </Field>
            <Field label="Description" className="md:col-span-2 xl:col-span-3">
              <textarea className={`${inputClass} min-h-24 py-3`} value={requestDraft.description} onChange={(event) => setRequestDraft({ ...requestDraft, description: event.target.value })} placeholder="Reason, supporting context, and expected next action." />
            </Field>
          </div>
          <Button className="mt-5" type="button" loading={busyKey === "create-request"} loadingLabel="Creating…" onClick={() => void createRequest()}>
            <Save aria-hidden="true" /> Create request
          </Button>
        </section>
      ) : null}

      {policyOpen && snapshot.capabilities.can_manage ? (
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
          <SectionTitle icon={ClipboardCheck} title={policyDraft.id ? "Edit approval policy" : "Create approval policy"} description="Policies match module, action, branch, currency, and amount. More specific active policies take priority." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Policy code"><input className={inputClass} value={policyDraft.code} onChange={(event) => setPolicyDraft({ ...policyDraft, code: event.target.value.toUpperCase() })} placeholder="PO-HIGH" /></Field>
            <Field label="Policy name"><input className={inputClass} value={policyDraft.name} onChange={(event) => setPolicyDraft({ ...policyDraft, name: event.target.value })} placeholder="High-value purchase approval" /></Field>
            <Field label="Required approvals">
              <select className={inputClass} value={policyDraft.requiredApprovals} onChange={(event) => setPolicyDraft({ ...policyDraft, requiredApprovals: event.target.value })}>
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </Field>
            <Field label="Module"><input className={inputClass} value={policyDraft.moduleKey} onChange={(event) => setPolicyDraft({ ...policyDraft, moduleKey: event.target.value.toLowerCase() })} /></Field>
            <Field label="Action"><input className={inputClass} value={policyDraft.actionKey} onChange={(event) => setPolicyDraft({ ...policyDraft, actionKey: event.target.value.toLowerCase() })} /></Field>
            <Field label="Branch">
              <select className={inputClass} value={policyDraft.branchId} onChange={(event) => setPolicyDraft({ ...policyDraft, branchId: event.target.value })}>
                <option value="">All branches</option>
                {snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
              </select>
            </Field>
            <Field label="Minimum amount"><input className={inputClass} type="number" min="0" step="0.01" value={policyDraft.minAmount} onChange={(event) => setPolicyDraft({ ...policyDraft, minAmount: event.target.value })} /></Field>
            <Field label="Maximum amount"><input className={inputClass} type="number" min="0" step="0.01" value={policyDraft.maxAmount} onChange={(event) => setPolicyDraft({ ...policyDraft, maxAmount: event.target.value })} /></Field>
            <Field label="Currency"><input className={inputClass} maxLength={3} value={policyDraft.currency} onChange={(event) => setPolicyDraft({ ...policyDraft, currency: event.target.value.toUpperCase() })} /></Field>
            <Field label="First approver">
              <select className={inputClass} value={policyDraft.approverUserId} onChange={(event) => setPolicyDraft({ ...policyDraft, approverUserId: event.target.value })}>
                <option value="">Open authorized queue</option>
                {snapshot.members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name} · {formatLabel(member.role)}</option>)}
              </select>
            </Field>
            <Field label="Description" className="md:col-span-2 xl:col-span-3">
              <textarea className={`${inputClass} min-h-24 py-3`} value={policyDraft.description} onChange={(event) => setPolicyDraft({ ...policyDraft, description: event.target.value })} />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" loading={busyKey === "save-policy"} loadingLabel="Saving…" onClick={() => void savePolicy()}><Save aria-hidden="true" /> Save policy</Button>
            {policyDraft.id ? <Button type="button" variant="ghost" onClick={() => setPolicyDraft(emptyPolicyDraft(baseCurrency))}><X aria-hidden="true" /> Clear edit</Button> : null}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Controlled queue</p>
            <h2 className="mt-1 text-xl font-black text-text-primary">Approval requests</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "cancelled", "all"] as const).map((status) => (
              <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`finance-focus min-h-9 rounded-full px-3 text-xs font-black ${statusFilter === status ? "bg-primary text-primary-foreground" : "bg-surface text-text-secondary"}`}>
                {formatLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {filteredRequests.length ? filteredRequests.map((request) => {
            const requestDecisions = decisionsByRequest[request.id] ?? [];
            const canDecideRequest = snapshot.capabilities.can_decide && request.status === "pending" && request.requested_by !== currentUserId && (!request.assigned_to || request.assigned_to === currentUserId);
            const canCancel = request.status === "pending" && (request.requested_by === currentUserId || snapshot.capabilities.can_manage);
            return (
              <article key={request.id} className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusClasses(request.status)}`}>{formatLabel(request.status)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${priorityClasses(request.priority)}`}>{formatLabel(request.priority)}</span>
                      <span className="text-xs font-black text-primary">{request.request_code}</span>
                    </div>
                    <h3 className="mt-3 text-base font-black text-text-primary sm:text-lg">{request.title}</h3>
                    <p className="mt-1 text-sm text-text-secondary">{request.subject_label} · {formatLabel(request.module_key)} / {formatLabel(request.action_key)}</p>
                    {request.description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{request.description}</p> : null}
                  </div>
                  <div className="shrink-0 text-left lg:text-right">
                    <strong className="block text-base text-text-primary">{formatAmount(request.amount, request.currency)}</strong>
                    <span className="mt-1 block text-xs text-text-secondary">{request.branch_name ?? "All branches"}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniFact label="Requested by" value={request.requester_name} />
                  <MiniFact label="Assigned to" value={request.assigned_name ?? "Open queue"} />
                  <MiniFact label="Approval progress" value={`${request.approval_count} of ${request.required_approvals}`} />
                  <MiniFact label="Created" value={formatDate(request.created_at)} />
                </div>

                {request.status === "pending" ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <textarea className={`${inputClass} min-h-20 py-3`} value={comments[request.id] ?? ""} onChange={(event) => setComments((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Add context, approval note, or rejection reason." />
                    <div className="flex flex-wrap items-start gap-2 lg:max-w-sm lg:justify-end">
                      {canDecideRequest ? (
                        <>
                          <Button size="sm" variant="success" loading={busyKey === `approved-${request.id}`} loadingLabel="Approving…" onClick={() => void decide(request, "approved")}><Check aria-hidden="true" /> Approve</Button>
                          <Button size="sm" variant="destructive" loading={busyKey === `rejected-${request.id}`} loadingLabel="Rejecting…" onClick={() => void decide(request, "rejected")}><X aria-hidden="true" /> Reject</Button>
                        </>
                      ) : null}
                      <Button size="sm" variant="outline" loading={busyKey === `comment-${request.id}`} loadingLabel="Adding…" onClick={() => void addComment(request)}><MessageSquareText aria-hidden="true" /> Comment</Button>
                      {canCancel ? <Button size="sm" variant="ghost" loading={busyKey === `cancel-${request.id}`} loadingLabel="Cancelling…" onClick={() => void cancelRequest(request)}><Ban aria-hidden="true" /> Cancel</Button> : null}
                    </div>
                  </div>
                ) : null}

                {snapshot.capabilities.can_manage && request.status === "pending" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Field label="Assign authorized approver" className="w-full sm:max-w-sm">
                      <select className={inputClass} value={assignments[request.id] ?? request.assigned_to ?? ""} onChange={(event) => setAssignments((current) => ({ ...current, [request.id]: event.target.value }))}>
                        <option value="">Choose approver</option>
                        {snapshot.members.filter((member) => member.user_id !== request.requested_by).map((member) => <option key={member.user_id} value={member.user_id}>{member.name} · {formatLabel(member.role)}</option>)}
                      </select>
                    </Field>
                    <Button size="sm" variant="outline" loading={busyKey === `assign-${request.id}`} loadingLabel="Assigning…" onClick={() => void assignRequest(request)}><UserRoundCheck aria-hidden="true" /> Assign</Button>
                  </div>
                ) : null}

                {requestDecisions.length ? (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-text-secondary">Decision history</p>
                    <div className="mt-3 space-y-2">
                      {requestDecisions.map((decision) => (
                        <div key={decision.id} className="flex flex-col gap-1 rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-text-primary"><strong>{decision.actor_name}</strong> · {formatLabel(decision.decision)}{decision.comment ? ` — ${decision.comment}` : ""}</span>
                          <span className="shrink-0 text-xs text-text-secondary">{formatDate(decision.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          }) : (
            <div className="rounded-[var(--radius-card)] bg-surface px-5 py-12 text-center text-sm text-text-secondary shadow-[var(--shadow-sm)]">No requests match this status.</div>
          )}
        </div>
      </section>

      {snapshot.capabilities.can_manage ? (
        <section>
          <SectionTitle icon={ClipboardCheck} title="Approval policies" description="Policies are controls, not transaction records. Deactivation preserves historical request snapshots and audit history." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.policies.length ? snapshot.policies.map((policy) => (
              <article key={policy.id} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${policy.active ? "bg-success-soft text-success" : "bg-surface-secondary text-text-secondary"}`}>{policy.active ? "Active" : "Inactive"}</span>
                  <span className="text-xs font-black text-primary">{policy.code}</span>
                </div>
                <h3 className="mt-4 font-black text-text-primary">{policy.name}</h3>
                <p className="mt-2 text-sm text-text-secondary">{formatLabel(policy.module_key)} / {formatLabel(policy.action_key)}</p>
                <div className="mt-4 space-y-2 text-sm text-text-secondary">
                  <p><strong className="text-text-primary">Range:</strong> {policy.min_amount === null && policy.max_amount === null ? "Any amount" : `${policy.currency ?? ""} ${policy.min_amount ?? 0} – ${policy.max_amount ?? "∞"}`}</p>
                  <p><strong className="text-text-primary">Branch:</strong> {policy.branch_name ?? "All branches"}</p>
                  <p><strong className="text-text-primary">Approvals:</strong> {policy.required_approvals}</p>
                  <p><strong className="text-text-primary">First approver:</strong> {policy.approver_name ?? "Open authorized queue"}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => editPolicy(policy)}><Pencil aria-hidden="true" /> Edit</Button>
                  <Button size="sm" variant="ghost" loading={busyKey === `policy-status-${policy.id}`} loadingLabel="Saving…" onClick={() => void setPolicyStatus(policy)}>{policy.active ? <Ban aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}{policy.active ? "Deactivate" : "Activate"}</Button>
                </div>
              </article>
            )) : <div className="md:col-span-2 xl:col-span-3 rounded-[var(--radius-card)] bg-surface px-5 py-12 text-center text-sm text-text-secondary shadow-[var(--shadow-sm)]">No approval policies yet. Requests can still use the default one-approver control.</div>}
          </div>
        </section>
      ) : null}

      {snapshot.audit.length ? (
        <section>
          <SectionTitle icon={ShieldCheck} title="Immutable control audit" description="Policy, assignment, request, comment, approval, rejection, and cancellation events are retained in tenant-scoped history." />
          <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]">
            {snapshot.audit.slice(0, 30).map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className="text-sm text-text-primary"><strong>{entry.actor_name}</strong> · {formatLabel(entry.action)}</span>
                <span className="text-xs text-text-secondary">{formatDate(entry.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: number }) {
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-4 text-xs font-bold text-text-secondary">{label}</p>
      <strong className="mt-1 block text-xl font-black text-text-primary">{value}</strong>
    </article>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof ClipboardCheck; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
      <div>
        <h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`grid gap-2 ${className}`}><span className={labelClass}>{label}</span>{children}</label>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div><span className="text-xs font-bold text-text-secondary">{label}</span><strong className="mt-1 block truncate text-sm text-text-primary">{value}</strong></div>;
}
