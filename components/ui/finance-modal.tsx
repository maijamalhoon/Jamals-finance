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
  "finance-panel flex max-h-[min(90dvh,760px)] w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden p-0 text-text-primary sm:w-full";

export const financeCancelButtonClass =
  "finance-focus inline-flex min-h-[var(--oneui-control-height-lg)] items-center justify-center rounded-[var(--oneui-button-radius)] border border-border bg-surface-secondary px-4 py-2 text-sm font-semibold text-text-primary transition-all hover:bg-hover active:scale-[0.985] disabled:opacity-50";

export const financeErrorClass =
  "rounded-[var(--oneui-control-radius)] border border-danger/20 bg-danger/10 p-3 text-xs text-danger";

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
        "shrink-0 border-b border-border px-5 py-4 pr-12",
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
        "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4",
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
      className={cn(
        "grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card px-4 py-3.5",
        className,
      )}
      {...props}
    />
  );
}
