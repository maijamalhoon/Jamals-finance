"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FinanceTone = "default" | "success" | "danger" | "info" | "investment" | "warning";

export const financeModalContentClass =
  "finance-modal-content finance-panel flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-md [--finance-modal-max-width:28rem] flex-col gap-0 overflow-hidden p-0 text-text-primary shadow-premium sm:max-h-[90dvh] sm:w-full";

export const financeCancelButtonClass =
  "finance-focus inline-flex min-h-[var(--oneui-control-height-lg)] items-center justify-center rounded-[var(--oneui-button-radius)] border border-border bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary transition-[background-color,border-color,color,transform] duration-[var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] hover:bg-hover active:scale-[0.985] disabled:opacity-50";

export const financeErrorClass =
  "rounded-[var(--oneui-control-radius)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm font-medium leading-5 text-danger";

export const financeFieldHintClass =
  "mt-1.5 text-xs font-medium leading-5 text-text-secondary";

export const financeFieldErrorClass =
  "mt-1.5 text-xs font-semibold leading-5 text-danger";

const toneAccentClass: Record<FinanceTone, string> = {
  default: "bg-active",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
  investment: "bg-investment",
  warning: "bg-warning",
};

interface FinanceModalHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  tone?: FinanceTone;
  badge?: React.ReactNode;
  className?: string;
}

export function FinanceModalHeader({
  title,
  description,
  icon: Icon,
  tone = "default",
  badge,
  className,
}: FinanceModalHeaderProps) {
  return (
    <DialogHeader
      data-tone={tone}
      className={cn(
        "finance-modal-header relative shrink-0 overflow-hidden border-b border-border px-4 py-4 pr-12 sm:px-5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-0.5", toneAccentClass[tone])}
      />
      <div className="flex min-w-0 items-start gap-3">
        <span className="finance-icon-container" data-size="sm" data-tone={tone}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <DialogTitle className="min-w-0 flex-1 break-words text-base leading-5 font-bold">
              {title}
            </DialogTitle>
            {badge}
          </div>
          <DialogDescription className="mt-1 text-xs leading-5 text-text-secondary">
            {description}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}

export function FinanceModalBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "finance-modal-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export function FinanceModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "finance-modal-footer grid shrink-0 grid-cols-1 gap-2 border-t border-border bg-card px-3.5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:grid-cols-2 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export function FinanceFormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="finance-form-field" className={cn("finance-form-field min-w-0", className)}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className={financeFieldErrorClass}>{error}</p>
      ) : hint ? (
        <p className={financeFieldHintClass}>{hint}</p>
      ) : null}
    </div>
  );
}
