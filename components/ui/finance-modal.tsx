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
  "finance-modal-content finance-panel flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden p-0 text-text-primary shadow-premium sm:w-full";

export const financeCancelButtonClass =
  "finance-focus inline-flex min-h-[var(--oneui-control-height-lg)] items-center justify-center rounded-[var(--oneui-button-radius)] border border-border bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary transition-all hover:bg-hover active:scale-[0.985] disabled:opacity-50";

export const financeErrorClass =
  "rounded-[var(--oneui-control-radius)] border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm font-medium leading-5 text-danger";

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
      className={cn(
        "shrink-0 border-b border-border px-4 py-4 pr-12 sm:px-5",
        className,
      )}
    >
      <DialogTitle className="flex min-w-0 items-center gap-3 text-base font-semibold">
        <span className="finance-icon-container" data-size="sm" data-tone={tone}>
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {badge}
      </DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
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
        "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-5",
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
        "grid shrink-0 grid-cols-1 gap-2 border-t border-border bg-card px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:grid-cols-2",
        className,
      )}
      {...props}
    />
  );
}
