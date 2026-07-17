"use client";

import { useEffect, useState } from "react";

export function useDashboardAnimationReady() {
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let secondFrameId = 0;

    const cancelFrames = () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(secondFrameId);
    };

    const prepareAnimation = () => {
      cancelFrames();
      const shouldReduceMotion = mediaQuery.matches;
      setReduceMotion(shouldReduceMotion);

      if (shouldReduceMotion) {
        setReady(true);
        return;
      }

      setReady(false);
      frameId = requestAnimationFrame(() => {
        secondFrameId = requestAnimationFrame(() => setReady(true));
      });
    };

    prepareAnimation();
    mediaQuery.addEventListener("change", prepareAnimation);

    return () => {
      cancelFrames();
      mediaQuery.removeEventListener("change", prepareAnimation);
    };
  }, []);

  return {
    ready,
    reduceMotion,
  };
}
