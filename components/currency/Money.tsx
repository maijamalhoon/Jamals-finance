"use client";

import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { MoneyFormatOptions } from "@/lib/currency";
import { cn } from "@/lib/utils";

export default function Money({
  amount,
  counted = false,
  options,
  className,
}: {
  amount: number | string | null | undefined;
  counted?: boolean;
  options?: MoneyFormatOptions;
  className?: string;
}) {
  const { formatCurrency } = useCurrency();
  const numeric = Number(amount ?? 0);
  const formatted = formatCurrency(Number.isFinite(numeric) ? numeric : 0, options);

  if (counted) {
    return (
      <span data-slot="money" className={cn("finance-amount", className)}>
        <CountedAmount amount={formatted} />
      </span>
    );
  }

  return (
    <span data-slot="money" className={cn("finance-amount", className)}>
      {formatted}
    </span>
  );
}
