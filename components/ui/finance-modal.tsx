"use client";

import type React from "react";
import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FinanceTone =
  | "default"
  | "success"
  | "danger"
  | "info"
  | "investment"
  | "warning";

export const financeModalContentClass =
  "finance-modal-content finance-panel flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-md [--finance-modal-max-width:28rem] flex-col gap-0 overflow-hidden p-0 text-text-primary shadow-premium sm:max-h-[min(90dvh,46rem)] sm:w-full";

export const financeCancelButtonClass =
  "finance-focus inline-flex min-h-[var(--oneui-control-height-lg)] items-center justify-center rounded-[var(--oneui-button-radius)] border border-border bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary transition-[background-color,border-color,color,transform] duration-[var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] hover:bg-hover active:scale-[0.985] disabled:opacity-50";

export const financePrimaryButtonClass =
  "finance-primary-action finance-focus inline-flex min-h-[var(--oneui-control-height-lg)] w-full items-center justify-center rounded-[var(--oneui-button-radius)] px-4 py-2.5 text-sm font-black text-text-inverse shadow-sm transition-[filter,transform,box-shadow] duration-[var(--motion-duration-fast)] hover:brightness-[1.04] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55";

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

const financeActionModalPolish = `
@media (max-width: 639px) {
  [data-slot="dialog-content"].finance-modal-content[style*="--finance-action"],
  [role="dialog"].finance-modal-content[style*="--finance-action"] {
    top: max(0.375rem, env(safe-area-inset-top)) !important;
    right: max(0.375rem, env(safe-area-inset-right)) !important;
    bottom: max(0.375rem, env(safe-area-inset-bottom)) !important;
    left: max(0.375rem, env(safe-area-inset-left)) !important;
    height: max-content !important;
    max-height: calc(100dvh - 0.75rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
    margin: auto !important;
    --tw-translate-x: 0px;
    --tw-translate-y: 0px;
    transform: none !important;
  }
}

.finance-modal-content[style*="--finance-action"] .finance-primary-action {
  background: var(--finance-action) !important;
  color: var(--text-inverse) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr);
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search)
  > label[for="investment-asset-search"] {
  order: 1;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search)
  > div:has(> #investment-asset-search) {
  position: relative;
  z-index: 2;
  order: 2;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search)
  > div.absolute {
  position: relative !important;
  inset: auto !important;
  order: 3;
  width: 100%;
  margin-top: -1px;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  box-shadow: var(--shadow-md) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search)
  > button {
  order: 4;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(#investment-asset-search):has(> div.absolute)
  #investment-asset-search {
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
`;

interface FinanceModalHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: FinanceTone;
  badge?: React.ReactNode;
  className?: string;
  showAccent?: boolean;
}

export function FinanceModalHeader({
  title,
  description,
  icon: Icon,
  tone = "default",
  badge,
  className,
  showAccent = false,
}: FinanceModalHeaderProps) {
  return (
    <DialogHeader
      data-tone={tone}
      className={cn(
        "finance-modal-header relative shrink-0 border-b border-border px-4 py-3.5 pr-16 text-left sm:px-5 sm:py-4",
        className,
      )}
    >
      {showAccent ? (
        <span
          aria-hidden="true"
          className={cn("absolute inset-x-0 top-0 h-0.5", toneAccentClass[tone])}
        />
      ) : null}

      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="finance-icon-container" data-size="sm" data-tone={tone}>
            <Icon size={16} strokeWidth={2.2} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle className="min-w-0 flex-1 break-words text-[17px] font-black leading-6 tracking-[-0.015em]">
              {title}
            </DialogTitle>
            {badge}
          </div>
          {description ? (
            <DialogDescription className="mt-0.5 text-xs leading-5 text-text-secondary">
              {description}
            </DialogDescription>
          ) : null}
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
    <>
      <style>{financeActionModalPolish}</style>
      <div
        className={cn(
          "finance-modal-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:space-y-3.5 sm:px-5 sm:py-4",
          className,
        )}
        {...props}
      />
    </>
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
        "finance-modal-footer grid shrink-0 grid-cols-1 gap-2 border-t border-border bg-card px-3.5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:px-5",
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
    <div
      data-slot="finance-form-field"
      className={cn("finance-form-field min-w-0", className)}
    >
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
