"use client";

import CountUp from "react-countup";
import { useReducedMotion } from "framer-motion";
import { useHasMounted } from "@/components/motion/useHasMounted";

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
  const parsedAmount = splitAmount(amount);

  if (
    !mounted ||
    reduceMotion ||
    !parsedAmount ||
    !Number.isFinite(parsedAmount.value)
  ) {
    return amount;
  }

  return (
    <span className="motion-counter-ready">
      {parsedAmount.prefix}
      <CountUp
        key={amount}
        start={0}
        end={parsedAmount.value}
        duration={duration}
        decimals={parsedAmount.decimals}
        separator=","
        redraw
      />
      {parsedAmount.suffix}
    </span>
  );
}
