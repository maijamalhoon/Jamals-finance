"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

function splitAmount(amount: string) {
  const cleanAmount = String(amount ?? "").trim();
  const match = cleanAmount.match(/-?[\d,]+(?:\.\d+)?/);

  if (!match || match.index === undefined) return null;

  const numericText = match[0];
  const numericStart = match.index;
  const numericEnd = numericStart + numericText.length;

  return {
    prefix: cleanAmount.slice(0, numericStart),
    value: Number(numericText.replace(/,/g, "")),
    decimals:
      numericText.includes(".") ? (numericText.split(".")[1]?.length ?? 0) : 0,
    suffix: cleanAmount.slice(numericEnd),
  };
}

export default function CountedAmount({
  amount,
  duration = 1.4,
  animateOnCompact = false,
}: {
  amount: string;
  duration?: number;
  animateOnCompact?: boolean;
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

    if (reduceMotion || (!animateOnCompact && compactViewport) || duration <= 0) {
      element.textContent = amount;
      return;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: parsedAmount.decimals,
      maximumFractionDigits: parsedAmount.decimals,
    });
    const formatValue = (value: number) =>
      `${parsedAmount.prefix}${formatter.format(value)}${parsedAmount.suffix}`;
    const durationMs = duration * 1000;
    const startedAt = performance.now();
    let frameId = 0;

    element.textContent = formatValue(0);

    const renderFrame = (time: number) => {
      const progress = Math.min((time - startedAt) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = parsedAmount.value * easedProgress;

      element.textContent = progress >= 1 ? amount : formatValue(currentValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    frameId = requestAnimationFrame(renderFrame);

    return () => cancelAnimationFrame(frameId);
  }, [amount, animateOnCompact, duration, parsedAmount]);

  return (
    <span ref={elementRef} className="tabular-nums">
      {amount}
    </span>
  );
}
