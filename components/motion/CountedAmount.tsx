"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

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
  const elementRef = useRef<HTMLSpanElement>(null);
  const parsedAmount = useMemo(() => splitAmount(amount), [amount]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !parsedAmount || !Number.isFinite(parsedAmount.value)) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const compactViewport = window.matchMedia("(max-width: 1023px)").matches;

    if (reduceMotion || compactViewport || duration <= 0) {
      element.textContent = amount;
      return;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: parsedAmount.decimals,
      maximumFractionDigits: parsedAmount.decimals,
    });
    const durationMs = duration * 1000;
    const startedAt = performance.now();
    let frameId = 0;

    const renderFrame = (time: number) => {
      const progress = Math.min((time - startedAt) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = parsedAmount.value * easedProgress;

      element.textContent = `${parsedAmount.prefix}${formatter.format(
        currentValue,
      )}${parsedAmount.suffix}`;

      if (progress < 1) {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    frameId = requestAnimationFrame(renderFrame);

    return () => cancelAnimationFrame(frameId);
  }, [amount, duration, parsedAmount]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {amount}
    </span>
  );
}
