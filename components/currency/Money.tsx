"use client";

import CountedAmount from "@/components/motion/CountedAmount";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { MoneyFormatOptions } from "@/lib/currency";

export default function Money({
  amount,
  counted = false,
  options,
}: {
  amount: number | string | null | undefined;
  counted?: boolean;
  options?: MoneyFormatOptions;
}) {
  const { formatCurrency } = useCurrency();
  const numeric = Number(amount ?? 0);
  const formatted = formatCurrency(Number.isFinite(numeric) ? numeric : 0, options);

  if (counted) return <CountedAmount amount={formatted} />;

  return <>{formatted}</>;
}
