import type { ReactNode } from "react";
import { CircleDollarSign, Clock3, FolderKanban, Gauge, ReceiptText, TrendingUp } from "lucide-react";

import type { BusinessProject, ProjectRecognitionRun } from "@/lib/business-projects";

export const inputClass = "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";

export function amount(value: number | string | null | undefined, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value ?? 0));
}
export function number(value: number | string | null | undefined, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(Number(value ?? 0));
}
export function statusLabel(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6"><div className="mb-4 flex items-center gap-3"><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">{icon}</span><h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2></div>{children}</section>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black text-text-secondary">{label}</span>{children}</label>; }
export function Empty({ text }: { text: string }) { return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-8 text-center text-sm text-text-secondary">{text}</div>; }
export function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <article className="rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-text-secondary">{label}</p><strong className="mt-1 block text-lg font-black text-text-primary">{value}</strong></div><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary [&_svg]:size-5">{icon}</span></div></article>; }

export function ProjectCard({ project, currency, selected, onSelect }: { project: BusinessProject; currency: string; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={`finance-focus w-full rounded-[var(--radius-button)] border p-4 text-left transition-colors ${selected ? "border-primary bg-primary-soft" : "border-transparent bg-surface-secondary hover:border-border-subtle"}`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-primary">{project.project_code}</p><strong className="mt-1 block truncate text-sm text-text-primary">{project.name}</strong><p className="mt-1 text-xs text-text-secondary">{project.customer_name ?? "Internal / no customer"}{project.branch_name ? ` · ${project.branch_name}` : " · Company-wide"}</p></div><span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-black text-text-secondary">{statusLabel(project.status)}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Metric label="Actual cost" value={amount(project.actual_cost_base, currency)} /><Metric label="Recognized" value={amount(project.recognized_revenue_base, currency)} /><Metric label="Gross profit" value={amount(project.gross_profit_base, currency)} /><Metric label="Progress" value={`${number(project.completion_percent)}%`} /></div>
  </button>;
}
function Metric({ label, value }: { label: string; value: string }) { return <span className="rounded-[var(--radius-button)] bg-surface px-3 py-2"><span className="block text-[10px] font-bold text-text-tertiary">{label}</span><strong className="mt-0.5 block text-text-primary">{value}</strong></span>; }

export function ProfitabilityStrip({ project, currency }: { project: BusinessProject; currency: string }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Mini icon={<CircleDollarSign />} label="Contract" value={amount(project.contract_value_base, currency)} /><Mini icon={<ReceiptText />} label="Billed" value={amount(project.billed_revenue_base, currency)} /><Mini icon={<TrendingUp />} label="Recognized" value={amount(project.recognized_revenue_base, currency)} /><Mini icon={<FolderKanban />} label="Actual cost" value={amount(project.actual_cost_base, currency)} /><Mini icon={<Gauge />} label="WIP / deferred" value={`${amount(project.wip_asset_base, currency)} / ${amount(project.deferred_revenue_base, currency)}`} /><Mini icon={<Clock3 />} label="Approved hours" value={number(project.approved_hours)} /></div>;
}
function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <article className="rounded-[var(--radius-button)] bg-surface-secondary p-3"><span className="text-primary [&_svg]:size-4">{icon}</span><p className="mt-2 text-[11px] font-bold text-text-secondary">{label}</p><strong className="mt-1 block text-sm text-text-primary">{value}</strong></article>; }

export function RecognitionCard({ run, currency, children }: { run: ProjectRecognitionRun; currency: string; children?: ReactNode }) {
  return <article className="rounded-[var(--radius-button)] bg-surface-secondary p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-text-primary">{run.project_code} · {run.recognition_date}</strong><p className="mt-1 text-xs text-text-secondary">{number(run.completion_percent)}% complete · target {amount(run.target_revenue_to_date, currency)} · billed {amount(run.billed_revenue_to_date, currency)}</p></div><span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-black text-text-secondary">{statusLabel(run.status)}{run.approval_code ? ` · ${run.approval_code}` : ""}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Adjustment" value={amount(run.current_adjustment_base, currency)} /><Metric label="WIP asset" value={amount(run.desired_wip_asset_base, currency)} /><Metric label="Deferred revenue" value={amount(run.desired_deferred_revenue_base, currency)} /></div>{children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}</article>;
}
