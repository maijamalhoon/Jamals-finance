"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ContactRound,
  Handshake,
  ListTodo,
  Plus,
  ShieldCheck,
  Trash2,
} from "@/components/icons/jalvoro/compat";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const SUPPORTED_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;

export type CrmMemberOption = {
  userId: string;
  name: string;
  role: string;
};

export type CrmLeadOption = {
  id: string;
  code: string;
  name: string;
  companyName: string | null;
  status: string;
  currency: string;
  estimatedValue: number | string;
  convertedContactId: string | null;
};

export type CrmContactOption = {
  id: string;
  name: string;
  currency: string;
  paymentTermsDays: number;
};

export type CrmOpportunityOption = {
  id: string;
  code: string;
  title: string;
  contactId: string | null;
  leadId: string | null;
};

export type CrmPipelineOption = {
  id: string;
  name: string;
};

export type CrmStageOption = {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  probability: number | string;
  category: "open" | "won" | "lost";
};

export type CrmProductOption = {
  id: string;
  sku: string;
  name: string;
  salesPrice: number | string;
  revenueAccountId: string;
};

export type CrmWarehouseOption = {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
};

export type CrmRevenueAccountOption = {
  id: string;
  code: string;
  name: string;
};

type OpportunityLine = {
  key: string;
  productId: string;
  warehouseId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  taxRate: string;
  revenueAccountId: string;
};

type Props = {
  businessId: string;
  baseCurrency: string;
  currentUserId: string;
  members: CrmMemberOption[];
  leads: CrmLeadOption[];
  contacts: CrmContactOption[];
  opportunities: CrmOpportunityOption[];
  pipelines: CrmPipelineOption[];
  stages: CrmStageOption[];
  products: CrmProductOption[];
  warehouses: CrmWarehouseOption[];
  revenueAccounts: CrmRevenueAccountOption[];
};

function requestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function numeric(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function localDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function newLine(defaultRevenueAccountId: string): OpportunityLine {
  return {
    key: requestKey(),
    productId: "",
    warehouseId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
    discountPercent: "0",
    taxRate: "0",
    revenueAccountId: defaultRevenueAccountId,
  };
}

export default function BusinessCrmForms({
  businessId,
  baseCurrency,
  currentUserId,
  members,
  leads,
  contacts,
  opportunities,
  pipelines,
  stages,
  products,
  warehouses,
  revenueAccounts,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = useState<"lead" | "opportunity" | "activity">("lead");
  const [saving, setSaving] = useState(false);

  const defaultPipelineId = pipelines[0]?.id ?? "";
  const defaultStageId = stages
    .filter((stage) => stage.pipelineId === defaultPipelineId && stage.category === "open")
    .sort((left, right) => left.position - right.position)[0]?.id ?? "";
  const defaultRevenueAccountId = revenueAccounts[0]?.id ?? "";
  const defaultWarehouseId =
    warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id ?? "";

  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSource, setLeadSource] = useState("other");
  const [leadCurrency, setLeadCurrency] = useState(baseCurrency);
  const [leadValue, setLeadValue] = useState("0");
  const [leadOwner, setLeadOwner] = useState(currentUserId);
  const [leadStatus, setLeadStatus] = useState("new");
  const [leadNotes, setLeadNotes] = useState("");

  const [opportunityLeadId, setOpportunityLeadId] = useState("");
  const [opportunityContactId, setOpportunityContactId] = useState("");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityPipelineId, setOpportunityPipelineId] = useState(defaultPipelineId);
  const [opportunityStageId, setOpportunityStageId] = useState(defaultStageId);
  const [opportunityCurrency, setOpportunityCurrency] = useState(baseCurrency);
  const [opportunityProbability, setOpportunityProbability] = useState("");
  const [opportunityCloseDate, setOpportunityCloseDate] = useState("");
  const [opportunityOwner, setOpportunityOwner] = useState(currentUserId);
  const [opportunityNotes, setOpportunityNotes] = useState("");
  const [lines, setLines] = useState<OpportunityLine[]>([newLine(defaultRevenueAccountId)]);

  const [activityTargetType, setActivityTargetType] = useState<"lead" | "opportunity" | "contact">("lead");
  const [activityTargetId, setActivityTargetId] = useState(leads[0]?.id ?? "");
  const [activityType, setActivityType] = useState("task");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [activityDueAt, setActivityDueAt] = useState("");
  const [activityOwner, setActivityOwner] = useState(currentUserId);
  const [activityStatus, setActivityStatus] = useState("open");

  const opportunityStages = stages
    .filter((stage) => stage.pipelineId === opportunityPipelineId)
    .sort((left, right) => left.position - right.position);

  const totals = useMemo(
    () =>
      lines.reduce(
        (result, line) => {
          const gross = numeric(line.quantity) * numeric(line.unitPrice);
          const discount = gross * (numeric(line.discountPercent) / 100);
          const net = gross - discount;
          const tax = net * (numeric(line.taxRate) / 100);
          return {
            gross: result.gross + gross,
            discount: result.discount + discount,
            tax: result.tax + tax,
            total: result.total + net + tax,
          };
        },
        { gross: 0, discount: 0, tax: 0, total: 0 },
      ),
    [lines],
  );

  function updateLine(key: string, changes: Partial<OpportunityLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  }

  function selectProduct(key: string, productId: string) {
    if (!productId) {
      updateLine(key, { productId: "", warehouseId: "" });
      return;
    }
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    updateLine(key, {
      productId,
      warehouseId: defaultWarehouseId,
      description: product.name,
      unitPrice: String(product.salesPrice ?? ""),
      revenueAccountId: product.revenueAccountId,
    });
  }

  function handlePipelineChange(pipelineId: string) {
    setOpportunityPipelineId(pipelineId);
    const firstOpenStage = stages
      .filter((stage) => stage.pipelineId === pipelineId && stage.category === "open")
      .sort((left, right) => left.position - right.position)[0];
    setOpportunityStageId(firstOpenStage?.id ?? "");
    setOpportunityProbability("");
  }

  function handleActivityTargetType(nextType: "lead" | "opportunity" | "contact") {
    setActivityTargetType(nextType);
    setActivityTargetId(
      nextType === "lead"
        ? leads[0]?.id ?? ""
        : nextType === "opportunity"
          ? opportunities[0]?.id ?? ""
          : contacts[0]?.id ?? "",
    );
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const estimatedValue = numeric(leadValue);
    if (leadName.trim().length < 2) {
      toast.error("Enter a lead name.");
      return;
    }
    if (estimatedValue < 0) {
      toast.error("Estimated value cannot be negative.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("upsert_business_crm_lead", {
      p_business_id: businessId,
      p_lead_id: null,
      p_display_name: leadName.trim(),
      p_company_name: leadCompany.trim() || null,
      p_email: leadEmail.trim() || null,
      p_phone: leadPhone.trim() || null,
      p_source: leadSource,
      p_currency: leadCurrency,
      p_estimated_value: estimatedValue,
      p_owner_user_id: leadOwner || null,
      p_status: leadStatus,
      p_notes: leadNotes.trim() || null,
    });
    setSaving(false);

    if (error) {
      console.error("CRM lead creation failed", { code: error.code });
      toast.error("Lead could not be saved. No CRM record was changed.");
      return;
    }

    setLeadName("");
    setLeadCompany("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadSource("other");
    setLeadValue("0");
    setLeadStatus("new");
    setLeadNotes("");
    toast.success("Lead added to CRM.");
    router.refresh();
  }

  async function submitOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!opportunityLeadId && !opportunityContactId) {
      toast.error("Select a lead or customer.");
      return;
    }
    if (opportunityTitle.trim().length < 2 || !opportunityPipelineId || !opportunityStageId) {
      toast.error("Complete the opportunity title and pipeline stage.");
      return;
    }
    const probability = opportunityProbability.trim() ? numeric(opportunityProbability) : null;
    if (probability !== null && (probability < 0 || probability > 100)) {
      toast.error("Probability must be between 0 and 100.");
      return;
    }

    const preparedLines = lines.map((line) => ({
      product_id: line.productId || null,
      warehouse_id: line.productId ? line.warehouseId || defaultWarehouseId || null : null,
      description: line.description.trim(),
      quantity: numeric(line.quantity),
      unit_price: numeric(line.unitPrice),
      discount_percent: numeric(line.discountPercent),
      tax_rate: numeric(line.taxRate),
      revenue_account_id: line.revenueAccountId || null,
    }));
    const invalidLine = preparedLines.some(
      (line) =>
        line.description.length < 2 ||
        line.quantity <= 0 ||
        line.unit_price < 0 ||
        line.discount_percent < 0 ||
        line.discount_percent > 100 ||
        line.tax_rate < 0 ||
        line.tax_rate > 100 ||
        !line.revenue_account_id ||
        (line.product_id !== null && line.warehouse_id === null),
    );
    if (invalidLine || totals.total <= 0) {
      toast.error("Complete every opportunity line with a valid description, quantity, price, account, and warehouse.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("upsert_business_crm_opportunity", {
      p_business_id: businessId,
      p_opportunity_id: null,
      p_lead_id: opportunityLeadId || null,
      p_contact_id: opportunityContactId || null,
      p_pipeline_id: opportunityPipelineId,
      p_stage_id: opportunityStageId,
      p_title: opportunityTitle.trim(),
      p_amount: totals.total,
      p_currency: opportunityCurrency,
      p_probability: probability,
      p_expected_close_date: opportunityCloseDate || null,
      p_owner_user_id: opportunityOwner || null,
      p_lost_reason: null,
      p_notes: opportunityNotes.trim() || null,
      p_lines: preparedLines,
    });
    setSaving(false);

    if (error) {
      console.error("CRM opportunity creation failed", { code: error.code });
      toast.error("Opportunity could not be saved. No partial line was created.");
      return;
    }

    setOpportunityLeadId("");
    setOpportunityContactId("");
    setOpportunityTitle("");
    setOpportunityProbability("");
    setOpportunityCloseDate("");
    setOpportunityNotes("");
    setLines([newLine(defaultRevenueAccountId)]);
    toast.success("Opportunity added to the pipeline.");
    router.refresh();
  }

  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!activityTargetId) {
      toast.error("Select a CRM target.");
      return;
    }
    if (activitySubject.trim().length < 2) {
      toast.error("Enter an activity subject.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("upsert_business_crm_activity", {
      p_business_id: businessId,
      p_activity_id: null,
      p_lead_id: activityTargetType === "lead" ? activityTargetId : null,
      p_opportunity_id: activityTargetType === "opportunity" ? activityTargetId : null,
      p_contact_id: activityTargetType === "contact" ? activityTargetId : null,
      p_activity_type: activityType,
      p_subject: activitySubject.trim(),
      p_details: activityDetails.trim() || null,
      p_due_at: activityDueAt ? new Date(activityDueAt).toISOString() : null,
      p_assigned_to: activityOwner || null,
      p_status: activityStatus,
    });
    setSaving(false);

    if (error) {
      console.error("CRM activity creation failed", { code: error.code });
      toast.error("Activity could not be saved.");
      return;
    }

    setActivitySubject("");
    setActivityDetails("");
    setActivityDueAt("");
    setActivityStatus("open");
    toast.success(activityStatus === "open" ? "Follow-up scheduled." : "CRM activity recorded.");
    router.refresh();
  }

  const tabs = [
    { key: "lead" as const, label: "New lead", icon: ContactRound },
    { key: "opportunity" as const, label: "New opportunity", icon: Handshake },
    { key: "activity" as const, label: "Follow-up", icon: ListTodo },
  ];

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <Handshake className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-black text-text-primary sm:text-lg">CRM command center</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
              Capture a lead, build a priced opportunity, or schedule the next customer action. Every write is tenant-checked by the database.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Secure CRM RPCs
        </span>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`finance-focus inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-secondary text-text-secondary hover:bg-primary-soft hover:text-primary"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "lead" ? (
        <form onSubmit={submitLead} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Lead name</span>
              <Input value={leadName} onChange={(event) => setLeadName(event.target.value)} placeholder="Person or decision maker" maxLength={160} disabled={saving} required />
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Company</span>
              <Input value={leadCompany} onChange={(event) => setLeadCompany(event.target.value)} placeholder="Optional company name" maxLength={200} disabled={saving} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Email</span>
              <Input type="email" value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} placeholder="name@example.com" maxLength={320} disabled={saving} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Phone</span>
              <Input value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} placeholder="+92..." maxLength={40} disabled={saving} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Source</span>
              <select value={leadSource} onChange={(event) => setLeadSource(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="social">Social</option>
                <option value="phone">Phone</option>
                <option value="walk_in">Walk in</option>
                <option value="campaign">Campaign</option>
                <option value="partner">Partner</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Lead status</span>
              <select value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Currency</span>
              <select value={leadCurrency} onChange={(event) => setLeadCurrency(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                {SUPPORTED_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Estimated value</span>
              <Input value={leadValue} onChange={(event) => setLeadValue(event.target.value)} inputMode="decimal" placeholder="0" disabled={saving} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-text-primary">Sales owner</span>
              <select value={leadOwner} onChange={(event) => setLeadOwner(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.role}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm font-bold text-text-primary">Notes</span>
              <textarea value={leadNotes} onChange={(event) => setLeadNotes(event.target.value)} className="field-input min-h-24 w-full resize-y py-3" maxLength={2000} placeholder="Needs, context, or qualification notes" disabled={saving} />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={saving} loadingLabel="Saving lead...">
              <ContactRound aria-hidden="true" />
              Add lead
            </Button>
          </div>
        </form>
      ) : null}

      {activeTab === "opportunity" ? (
        <form onSubmit={submitOpportunity} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">Opportunity title</span>
              <Input value={opportunityTitle} onChange={(event) => setOpportunityTitle(event.target.value)} placeholder="Example: Annual supply contract" maxLength={200} disabled={saving} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Lead</span>
              <select value={opportunityLeadId} onChange={(event) => setOpportunityLeadId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="">No lead</option>
                {leads.filter((lead) => lead.status !== "disqualified").map((lead) => <option key={lead.id} value={lead.id}>{lead.code} · {lead.companyName ?? lead.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Customer</span>
              <select value={opportunityContactId} onChange={(event) => setOpportunityContactId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="">No customer yet</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Pipeline</span>
              <select value={opportunityPipelineId} onChange={(event) => handlePipelineChange(event.target.value)} className="field-input min-h-11 w-full" disabled={saving} required>
                {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Stage</span>
              <select value={opportunityStageId} onChange={(event) => setOpportunityStageId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving} required>
                {opportunityStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} · {Number(stage.probability)}%</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Currency</span>
              <select value={opportunityCurrency} onChange={(event) => setOpportunityCurrency(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                {SUPPORTED_CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Probability override</span>
              <Input value={opportunityProbability} onChange={(event) => setOpportunityProbability(event.target.value)} inputMode="decimal" placeholder="Use stage default" disabled={saving} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Expected close</span>
              <Input type="date" min={localDateString()} value={opportunityCloseDate} onChange={(event) => setOpportunityCloseDate(event.target.value)} disabled={saving} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-text-primary">Sales owner</span>
              <select value={opportunityOwner} onChange={(event) => setOpportunityOwner(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.role}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm font-bold text-text-primary">Notes</span>
              <textarea value={opportunityNotes} onChange={(event) => setOpportunityNotes(event.target.value)} className="field-input min-h-20 w-full resize-y py-3" maxLength={2000} placeholder="Commercial notes or next negotiation point" disabled={saving} />
            </label>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-black text-text-primary">Opportunity lines</h3>
                <p className="mt-1 text-sm text-text-secondary">Use inventory products or service lines. These exact lines become the invoice later.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, newLine(defaultRevenueAccountId)])} disabled={saving || lines.length >= 100}>
                <Plus aria-hidden="true" />
                Add line
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {lines.map((line, index) => (
                <div key={line.key} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-text-primary">Line {index + 1}</strong>
                    <button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} disabled={saving || lines.length === 1} className="finance-focus inline-flex size-9 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40" aria-label={`Remove line ${index + 1}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Product</span>
                      <select value={line.productId} onChange={(event) => selectProduct(line.key, event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                        <option value="">Service or custom line</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Warehouse</span>
                      <select value={line.warehouseId} onChange={(event) => updateLine(line.key, { warehouseId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving || !line.productId}>
                        <option value="">Select warehouse</option>
                        {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-bold text-text-secondary">Description</span>
                      <Input value={line.description} onChange={(event) => updateLine(line.key, { description: event.target.value })} placeholder="Product, service, or scope" maxLength={500} disabled={saving} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Quantity</span>
                      <Input value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} inputMode="decimal" disabled={saving} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Unit price</span>
                      <Input value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} inputMode="decimal" placeholder="0" disabled={saving} required />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Discount %</span>
                      <Input value={line.discountPercent} onChange={(event) => updateLine(line.key, { discountPercent: event.target.value })} inputMode="decimal" disabled={saving} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-text-secondary">Tax %</span>
                      <Input value={line.taxRate} onChange={(event) => updateLine(line.key, { taxRate: event.target.value })} inputMode="decimal" disabled={saving} />
                    </label>
                    <label className="space-y-2 md:col-span-2 xl:col-span-4">
                      <span className="text-xs font-bold text-text-secondary">Revenue account</span>
                      <select value={line.revenueAccountId} onChange={(event) => updateLine(line.key, { revenueAccountId: event.target.value })} className="field-input min-h-11 w-full" disabled={saving} required>
                        {revenueAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-primary-soft px-4 py-4 text-primary sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-black">Pipeline value: {new Intl.NumberFormat("en", { style: "currency", currency: opportunityCurrency, maximumFractionDigits: 2 }).format(totals.total)}</span>
            <Button type="submit" loading={saving} loadingLabel="Saving opportunity...">
              <Handshake aria-hidden="true" />
              Add opportunity
            </Button>
          </div>
        </form>
      ) : null}

      {activeTab === "activity" ? (
        <form onSubmit={submitActivity} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Target type</span>
              <select value={activityTargetType} onChange={(event) => handleActivityTargetType(event.target.value as "lead" | "opportunity" | "contact")} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="lead">Lead</option>
                <option value="opportunity">Opportunity</option>
                <option value="contact">Customer</option>
              </select>
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-bold text-text-primary">CRM record</span>
              <select value={activityTargetId} onChange={(event) => setActivityTargetId(event.target.value)} className="field-input min-h-11 w-full" disabled={saving} required>
                <option value="">Select record</option>
                {activityTargetType === "lead" ? leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.code} · {lead.companyName ?? lead.name}</option>) : null}
                {activityTargetType === "opportunity" ? opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.code} · {opportunity.title}</option>) : null}
                {activityTargetType === "contact" ? contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>) : null}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Activity</span>
              <select value={activityType} onChange={(event) => setActivityType(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="task">Task</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-text-primary">Subject</span>
              <Input value={activitySubject} onChange={(event) => setActivitySubject(event.target.value)} placeholder="Example: Follow up on proposal" maxLength={200} disabled={saving} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Due date and time</span>
              <Input type="datetime-local" value={activityDueAt} onChange={(event) => setActivityDueAt(event.target.value)} disabled={saving} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Status</span>
              <select value={activityStatus} onChange={(event) => setActivityStatus(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="open">Open follow-up</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-text-primary">Assigned to</span>
              <select value={activityOwner} onChange={(event) => setActivityOwner(event.target.value)} className="field-input min-h-11 w-full" disabled={saving}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.name} · {member.role}</option>)}
              </select>
            </label>
            <label className="space-y-2 md:col-span-2 xl:col-span-4">
              <span className="text-sm font-bold text-text-primary">Details</span>
              <textarea value={activityDetails} onChange={(event) => setActivityDetails(event.target.value)} className="field-input min-h-24 w-full resize-y py-3" maxLength={2000} placeholder="Agenda, call notes, or expected next step" disabled={saving} />
            </label>
          </div>
          <div className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              Open due activities automatically update the lead and opportunity next-follow-up time.
            </span>
            <Button type="submit" loading={saving} loadingLabel="Saving activity...">
              <ListTodo aria-hidden="true" />
              Save activity
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
