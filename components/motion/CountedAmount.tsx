"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";

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

type RunningAmountAnimation = {
  element: HTMLSpanElement;
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
  finalText: string;
  formatValue: (value: number) => string;
  valueRef: MutableRefObject<number>;
};

const runningAnimations = new Map<HTMLSpanElement, RunningAmountAnimation>();
let sharedAnimationFrame: number | null = null;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function renderSharedFrame(time: number) {
  sharedAnimationFrame = null;

  runningAnimations.forEach((animation, element) => {
    if (!element.isConnected) {
      runningAnimations.delete(element);
      return;
    }

    if (time < animation.startedAt) return;

    const progress = Math.min(
      Math.max((time - animation.startedAt) / animation.durationMs, 0),
      1,
    );
    const currentValue =
      animation.from +
      (animation.to - animation.from) * easeOutCubic(progress);

    animation.valueRef.current = currentValue;
    element.textContent =
      progress >= 1 ? animation.finalText : animation.formatValue(currentValue);

    if (progress >= 1) {
      animation.valueRef.current = animation.to;
      runningAnimations.delete(element);
    }
  });

  if (runningAnimations.size > 0) {
    sharedAnimationFrame = requestAnimationFrame(renderSharedFrame);
  }
}

function startSharedAnimation(animation: RunningAmountAnimation) {
  runningAnimations.set(animation.element, animation);

  if (sharedAnimationFrame === null) {
    sharedAnimationFrame = requestAnimationFrame(renderSharedFrame);
  }
}

function stopSharedAnimation(element: HTMLSpanElement) {
  runningAnimations.delete(element);

  if (runningAnimations.size === 0 && sharedAnimationFrame !== null) {
    cancelAnimationFrame(sharedAnimationFrame);
    sharedAnimationFrame = null;
  }
}

export default function CountedAmount({
  amount,
  duration = 1.4,
  delay = 0,
  animateOnCompact = false,
}: {
  amount: string;
  duration?: number;
  delay?: number;
  animateOnCompact?: boolean;
}) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const currentValueRef = useRef(0);
  const hasAnimatedRef = useRef(false);
  const parsedAmount = useMemo(() => splitAmount(amount), [amount]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !parsedAmount || !Number.isFinite(parsedAmount.value)) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const compactViewport = window.matchMedia("(max-width: 1023px)").matches;
    const shouldAnimate =
      !reduceMotion &&
      (animateOnCompact || !compactViewport) &&
      duration > 0;

    stopSharedAnimation(element);

    if (!shouldAnimate) {
      currentValueRef.current = parsedAmount.value;
      hasAnimatedRef.current = true;
      element.textContent = amount;
      return;
    }

    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: parsedAmount.decimals,
      maximumFractionDigits: parsedAmount.decimals,
    });
    const formatValue = (value: number) =>
      `${parsedAmount.prefix}${formatter.format(value)}${parsedAmount.suffix}`;
    const fromValue = hasAnimatedRef.current ? currentValueRef.current : 0;

    hasAnimatedRef.current = true;
    currentValueRef.current = fromValue;
    element.textContent = formatValue(fromValue);

    if (fromValue === parsedAmount.value) {
      element.textContent = amount;
      return;
    }

    startSharedAnimation({
      element,
      from: fromValue,
      to: parsedAmount.value,
      startedAt: performance.now() + Math.max(0, delay) * 1000,
      durationMs: Math.max(duration * 1000, 1),
      finalText: amount,
      formatValue,
      valueRef: currentValueRef,
    });

    return () => stopSharedAnimation(element);
  }, [amount, animateOnCompact, delay, duration, parsedAmount]);

  return (
    <span ref={elementRef} aria-label={amount} className="tabular-nums">
      {amount}
    </span>
  );
}
