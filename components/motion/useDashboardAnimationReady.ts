"use client";

import { useEffect, useState } from "react";
import {
  getAnimationDurationScale,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

export function useDashboardAnimationReady() {
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animationMode, setAnimationMode] =
    useState<AnimationMode>("standard");

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
      const mode = getDocumentAnimationMode();
      const shouldReduceMotion = mediaQuery.matches || mode === "none";
      setAnimationMode(mode);
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
    animationMode,
    durationScale: getAnimationDurationScale(animationMode),
  };
}
