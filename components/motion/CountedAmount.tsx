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
  duration = 1.05,
}: {
  amount: string;
  duration?: number;
}) {
  const mounted = useHasMounted();
  const reduceMotion = useReducedMotion();
  const parsed = splitAmount(amount);

  if (!mounted || reduceMotion || !parsed || !Number.isFinite(parsed.value)) {
    return amount;
  }

  return (
    <>
      {parsed.prefix}
      <CountUp
        key={amount}
        start={0}
        end={parsed.value}
        duration={duration}
        decimals={parsed.decimals}
        separator=","
        redraw
      />
      {parsed.suffix}
    </>
  );
}
