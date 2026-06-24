"use client";

import CountUp from "react-countup";
import { useReducedMotion } from "framer-motion";
import { useHasMounted } from "@/components/motion/useHasMounted";
import { useCurrency } from "@/components/currency/CurrencyProvider";

function splitAmount(amount: string) {
  const cleaned = String(amount ?? "").trim();
  const match = cleaned.match(/^([^0-9-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);

  if (!match) return null;

  return {
    prefix: match[1],
    value: Number(match[2].replace(/,/g, "")),
    decimals:
      match[2].includes(".") ? (match[2].split(".")[1]?.length ?? 0) : 0,
    suffix: match[3],
  };
}

export default function CountedAmount({
  amount,
  duration = 1.15,
}: {
  amount: string;
  duration?: number;
}) {
  const mounted = useHasMounted();
  const reduceMotion = useReducedMotion();
  const { formatCurrency } = useCurrency();
  const parsedAmount = splitAmount(amount);
  const isMoneyAmount = /^([+-]?\s*)?PKR\s*/.test(String(amount ?? "").trim());
  const sign =
    parsedAmount?.prefix.includes("-") ? "-"
    : parsedAmount?.prefix.includes("+") ? "+"
    : Number(parsedAmount?.value) < 0 ? "-"
    : "";
  const displayAmount =
    parsedAmount && isMoneyAmount ?
      `${sign}${formatCurrency(Math.abs(parsedAmount.value))}`
    : amount;
  const parsedDisplayAmount = splitAmount(displayAmount);

  if (
    !mounted ||
    reduceMotion ||
    !parsedDisplayAmount ||
    !Number.isFinite(parsedDisplayAmount.value)
  ) {
    return displayAmount;
  }

  return (
    <span className="motion-counter-ready">
      {parsedDisplayAmount.prefix}
      <CountUp
        key={displayAmount}
        start={0}
        end={parsedDisplayAmount.value}
        duration={duration}
        decimals={parsedDisplayAmount.decimals}
        separator=","
        redraw
      />
      {parsedDisplayAmount.suffix}
    </span>
  );
}
