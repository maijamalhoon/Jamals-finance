"use client";

import { useEffect, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setReduced(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
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
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    setDisplayValue(0);

    let frameId = 0;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      frameId = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(frameId);
    };
  }, [value, delay, duration, reducedMotion]);

  return displayValue;
}

