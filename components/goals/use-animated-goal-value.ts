"use client";

import { useEffect, useState } from "react";
import {
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  getAnimationDurationScale,
  getDocumentAnimationMode,
} from "@/lib/animation-preference";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReduced(
        getDocumentAnimationMode() === "none" || mediaQuery.matches,
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANIMATION_STORAGE_KEY) return;
      update();
    };

    update();
    mediaQuery.addEventListener("change", update);
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, update);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", update);
      window.removeEventListener(ANIMATION_MODE_CHANGE_EVENT, update);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return reduced;
}

export function useProgressReveal(
  reducedMotion: boolean,
  resetKey?: string | number,
) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);

    if (reducedMotion) {
      setReady(true);
      return;
    }

    const frameId = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frameId);
  }, [reducedMotion, resetKey]);

  return ready;
}

export function useAnimatedGoalValue(
  value: number,
  delay = 0,
  duration = 820,
) {
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    const durationScale = getAnimationDurationScale();
    const scaledDuration = duration * durationScale;
    const scaledDelay = delay * durationScale;

    if (reducedMotion || scaledDuration <= 0) {
      setDisplayValue(value);
      return;
    }

    setDisplayValue(0);

    let frameId = 0;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / scaledDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      frameId = requestAnimationFrame(animate);
    }, scaledDelay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
    };
  }, [value, delay, duration, reducedMotion]);

  return displayValue;
}
