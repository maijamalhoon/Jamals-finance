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
    const frameIntervalMs = compactViewport ? 1000 / 30 : 1000 / 45;

    let frameId = 0;
    let observer: IntersectionObserver | null = null;
    let visibilityListener: (() => void) | null = null;
    let cancelled = false;
    let started = false;

    element.textContent = formatValue(0);

    const startAnimation = () => {
      if (cancelled || started) return;

      if (document.visibilityState === "hidden") {
        visibilityListener = () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", visibilityListener!);
          visibilityListener = null;
          startAnimation();
        };
        document.addEventListener("visibilitychange", visibilityListener);
        return;
      }

      started = true;
      observer?.disconnect();
      observer = null;

      const startedAt = performance.now();
      let lastRenderedAt = startedAt - frameIntervalMs;

      const renderFrame = (time: number) => {
        if (cancelled) return;

        const progress = Math.min((time - startedAt) / durationMs, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        if (time - lastRenderedAt >= frameIntervalMs || progress >= 1) {
          const currentValue = parsedAmount.value * easedProgress;
          element.textContent = progress >= 1 ? amount : formatValue(currentValue);
          lastRenderedAt = time;
        }

        if (progress < 1) {
          frameId = requestAnimationFrame(renderFrame);
        }
      };

      frameId = requestAnimationFrame(renderFrame);
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            startAnimation();
          }
        },
        {
          rootMargin: "120px 0px",
          threshold: 0.01,
        },
      );
      observer.observe(element);
    } else {
      startAnimation();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(frameId);
      if (visibilityListener) {
        document.removeEventListener("visibilitychange", visibilityListener);
      }
    };
  }, [amount, animateOnCompact, duration, parsedAmount]);

  return (
    <span ref={elementRef} aria-label={amount} className="tabular-nums">
      {amount}
    </span>
  );
}
