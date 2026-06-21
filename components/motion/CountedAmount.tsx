"use client";

import { useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import { useHasMounted } from "@/components/motion/useHasMounted";

function splitAmount(amount: string) {
  const match = amount.match(/^([^0-9-]*)([-\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  return {
    prefix: match[1],
    value: Number(match[2].replace(/,/g, "")),
    decimals: match[2].includes(".") ? match[2].split(".")[1]?.length ?? 0 : 0,
    suffix: match[3],
  };
}

export default function CountedAmount({ amount }: { amount: string }) {
  const mounted = useHasMounted();
  const reduceMotion = useReducedMotion();
  const parsedAmount = splitAmount(amount);

  if (!mounted || reduceMotion || !parsedAmount) return amount;

  return (
    <>
      {parsedAmount.prefix}
      <CountUp
        end={parsedAmount.value}
        duration={0.85}
        decimals={parsedAmount.decimals}
        separator=","
        preserveValue
      />
      {parsedAmount.suffix}
    </>
  );
}
