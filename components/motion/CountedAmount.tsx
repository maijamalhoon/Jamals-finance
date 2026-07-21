"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import {
  getAnimationDurationScale,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

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

type AnimationProfile = "default" | "dashboard";

type RunningAmountAnimation = {
  element: HTMLSpanElement;
  from: number;
  to: number;
  startedAt: number;
  durationMs: number;
  finalText: string;
  formatValue: (value: number) => string;
  valueRef: MutableRefObject<number>;
  profile: AnimationProfile;
  lastText: string;
};

const runningAnimations = new Map<HTMLSpanElement, RunningAmountAnimation>();
const formatterCache = new Map<number, Intl.NumberFormat>();
let sharedAnimationFrame: number | null = null;

const COUNT_DURATION_SCALE = 1.4;
const MIN_COUNT_DURATION_MS = 1450;
const DASHBOARD_DURATION_SCALE = 0.92;
const DASHBOARD_MIN_DURATION_MS = 900;
const DASHBOARD_MAX_DURATION_MS = 1350;

const STANDARD_COUNT_MIN_MS = 560;
const STANDARD_COUNT_MAX_MS = 880;
const STANDARD_DASHBOARD_MIN_MS = 480;
const STANDARD_DASHBOARD_MAX_MS = 760;
const STANDARD_MAX_DELAY_MS = 110;

function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function dashboardEase(progress: number) {
  return 1 - Math.pow(1 - progress, 4);
}

function getAnimationProgress(progress: number, profile: AnimationProfile) {
  return profile === "dashboard" ? dashboardEase(progress) : smoothStep(progress);
}

function getFormatter(decimals: number) {
  const safeDecimals = Math.max(0, Math.min(8, decimals));
  const cached = formatterCache.get(safeDecimals);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: safeDecimals,
    maximumFractionDigits: safeDecimals,
  });
  formatterCache.set(safeDecimals, formatter);
  return formatter;
}

function getAnimationDuration(
  duration: number,
  profile: AnimationProfile,
  animationMode: AnimationMode,
) {
  const preferenceScale = getAnimationDurationScale(animationMode);
  if (preferenceScale === 0) return 0;

  if (animationMode === "standard") {
    if (profile === "dashboard") {
      return Math.min(
        STANDARD_DASHBOARD_MAX_MS,
        Math.max(duration * 560, STANDARD_DASHBOARD_MIN_MS),
      );
    }

    return Math.min(
      STANDARD_COUNT_MAX_MS,
      Math.max(duration * 620, STANDARD_COUNT_MIN_MS),
    );
  }

  if (profile === "dashboard") {
    return (
      Math.min(
        DASHBOARD_MAX_DURATION_MS,
        Math.max(
          duration * 1000 * DASHBOARD_DURATION_SCALE,
          DASHBOARD_MIN_DURATION_MS,
        ),
      ) * preferenceScale
    );
  }

  return (
    Math.max(duration * 1000 * COUNT_DURATION_SCALE, MIN_COUNT_DURATION_MS) *
    preferenceScale
  );
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
    const easedProgress = getAnimationProgress(progress, animation.profile);
    const currentValue =
      animation.from + (animation.to - animation.from) * easedProgress;
    const nextText =
      progress >= 1 ? animation.finalText : animation.formatValue(currentValue);

    animation.valueRef.current = currentValue;

    if (nextText !== animation.lastText) {
      element.textContent = nextText;
      animation.lastText = nextText;
    }

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
    if (!element) return;

    if (!parsedAmount || !Number.isFinite(parsedAmount.value)) {
      element.textContent = amount;
      element.style.visibility = "visible";
      return;
    }

    const animationMode = getDocumentAnimationMode();
    const reduceMotion =
      animationMode === "none" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactViewport = window.matchMedia("(max-width: 1023px)").matches;
    const profile: AnimationProfile = element.closest(".dashboard-overview")
      ? "dashboard"
      : "default";
    const animationDurationMs = getAnimationDuration(
      duration,
      profile,
      animationMode,
    );
    const shouldAnimate =
      !reduceMotion &&
      (animationMode === "standard" || animateOnCompact || !compactViewport) &&
      duration > 0 &&
      animationDurationMs > 0;

    stopSharedAnimation(element);

    if (!shouldAnimate) {
      currentValueRef.current = parsedAmount.value;
      hasAnimatedRef.current = true;
      element.textContent = amount;
      element.style.visibility = "visible";
      return;
    }

    const formatter = getFormatter(parsedAmount.decimals);
    const precisionFactor = 10 ** parsedAmount.decimals;
    const formatValue = (value: number) => {
      const roundedValue =
        Math.round(value * precisionFactor) / precisionFactor;
      const displayValue = Object.is(roundedValue, -0) ? 0 : roundedValue;
      return `${parsedAmount.prefix}${formatter.format(displayValue)}${parsedAmount.suffix}`;
    };
    const fromValue = hasAnimatedRef.current ? currentValueRef.current : 0;

    hasAnimatedRef.current = true;
    currentValueRef.current = fromValue;
    const initialText = formatValue(fromValue);
    element.textContent = initialText;
    element.style.visibility = "visible";

    if (fromValue === parsedAmount.value) {
      element.textContent = amount;
      return;
    }

    const authoredDelayMs = Math.max(0, delay) * 1000;
    const resolvedDelayMs =
      animationMode === "standard"
        ? Math.min(authoredDelayMs, STANDARD_MAX_DELAY_MS)
        : authoredDelayMs * getAnimationDurationScale(animationMode);

    startSharedAnimation({
      element,
      from: fromValue,
      to: parsedAmount.value,
      startedAt: performance.now() + resolvedDelayMs,
      durationMs: animationDurationMs,
      finalText: amount,
      formatValue,
      valueRef: currentValueRef,
      profile,
      lastText: initialText,
    });

    return () => stopSharedAnimation(element);
  }, [amount, animateOnCompact, delay, duration, parsedAmount]);

  return (
    <span
      ref={elementRef}
      aria-label={amount}
      className="tabular-nums"
      style={{ visibility: "hidden" }}
    >
      {amount}
    </span>
  );
}
