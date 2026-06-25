"use client";

import { useMemo } from "react";
import CountUp from "react-countup";
import { useHasMounted } from "@/components/motion/useHasMounted";

function splitAmount(amount: string) {
  const cleanAmount = String(amount ?? "").trim();

  const match = cleanAmount.match(/^([^0-9-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);

  if (!match) return null;

  const numericText = match[2];

  return {
    prefix: match[1],
    value: Number(numericText.replace(/,/g, "")),
    decimals:
      numericText.includes(".") ? (numericText.split(".")[1]?.length ?? 0) : 0,
    suffix: match[3],
  };
}

export default function CountedAmount({
  amount,
  duration = 1.4,
}: {
  amount: string;
  duration?: number;
}) {
  const mounted = useHasMounted();

  const parsedAmount = useMemo(() => splitAmount(amount), [amount]);

  if (!mounted || !parsedAmount) return <>{amount}</>;

  return (
    <span className="tabular-nums">
      {parsedAmount.prefix}
      <CountUp
        key={amount}
        start={0}
        end={parsedAmount.value}
        duration={duration}
        decimals={parsedAmount.decimals}
        separator=","
        useEasing
        redraw
      />
      {parsedAmount.suffix}
    </span>
  );
}
