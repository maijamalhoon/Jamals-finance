"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOptionalCurrency } from "@/components/currency/CurrencyProvider";
import {
  BASE_CURRENCY,
  FALLBACK_USD_PKR_RATE,
  convertMoney,
} from "@/lib/currency";
import { cn } from "@/lib/utils";

type FinanceTone =
  | "default"
  | "success"
  | "danger"
  | "info"
  | "investment"
  | "warning";

type CurrencyInputProps = {
  value?: string | number | readonly string[];
  type?: string;
  min?: string | number;
  max?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

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

function toEditableCurrencyValue(value: number) {
  if (!Number.isFinite(value)) return "";

  const rounded = Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function convertCurrencyConstraint(
  value: string | number | undefined,
  currency: "PKR" | "USD",
  rate: number,
) {
  if (value === undefined || value === "" || currency === BASE_CURRENCY) {
    return value;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return toEditableCurrencyValue(
    convertMoney(numericValue, BASE_CURRENCY, currency, rate),
  );
}

function CurrencyAwareInput({
  child,
  currency,
  rate,
}: {
  child: React.ReactElement<CurrencyInputProps>;
  currency: "PKR" | "USD";
  rate: number;
}) {
  const sourceValue = Array.isArray(child.props.value)
    ? child.props.value[0]
    : child.props.value;
  const baseValue = sourceValue === undefined ? "" : String(sourceValue);
  const displayValue = useMemo(() => {
    if (baseValue === "" || currency === BASE_CURRENCY) return baseValue;

    const numericValue = Number(baseValue);
    if (!Number.isFinite(numericValue)) return baseValue;

    return toEditableCurrencyValue(
      convertMoney(numericValue, BASE_CURRENCY, currency, rate),
    );
  }, [baseValue, currency, rate]);
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(displayValue);

  useEffect(() => {
    if (!editing) setDraftValue(displayValue);
  }, [displayValue, editing]);

  if (
    currency === BASE_CURRENCY ||
    child.props.type !== "number" ||
    !child.props.onChange
  ) {
    return child;
  }

  return React.cloneElement(child, {
    value: editing ? draftValue : displayValue,
    min: convertCurrencyConstraint(child.props.min, currency, rate),
    max: convertCurrencyConstraint(child.props.max, currency, rate),
    onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
      setDraftValue(displayValue);
      setEditing(true);
      child.props.onFocus?.(event);
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextDisplayValue = event.target.value;
      setDraftValue(nextDisplayValue);

      let nextBaseValue = nextDisplayValue;
      if (nextDisplayValue !== "") {
        const numericValue = Number(nextDisplayValue);
        if (Number.isFinite(numericValue)) {
          nextBaseValue = toEditableCurrencyValue(
            convertMoney(numericValue, currency, BASE_CURRENCY, rate),
          );
        }
      }

      const input = event.currentTarget;
      const visibleValue = input.value;

      try {
        input.value = nextBaseValue;
        child.props.onChange?.(event);
      } finally {
        input.value = visibleValue;
      }
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      setEditing(false);
      child.props.onBlur?.(event);
    },
  });
}

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
  const currencyContext = useOptionalCurrency();
  const currency = currencyContext?.currency ?? BASE_CURRENCY;
  const rate = currencyContext?.rate ?? FALLBACK_USD_PKR_RATE;
  const isCurrencyAmountField =
    typeof label === "string" && label.includes(`(${BASE_CURRENCY})`);
  const resolvedLabel =
    isCurrencyAmountField ? label.replace(BASE_CURRENCY, currency) : label;
  const resolvedChildren =
    isCurrencyAmountField && React.isValidElement<CurrencyInputProps>(children) ? (
      <CurrencyAwareInput child={children} currency={currency} rate={rate} />
    ) : (
      children
    );

  return (
    <div
      data-slot="finance-form-field"
      className={cn("finance-form-field min-w-0", className)}
    >
      <label className="field-label" htmlFor={htmlFor}>
        {resolvedLabel}
      </label>
      {resolvedChildren}
      {error ? (
        <p className={financeFieldErrorClass}>{error}</p>
      ) : hint ? (
        <p className={financeFieldHintClass}>{hint}</p>
      ) : null}
    </div>
  );
}
