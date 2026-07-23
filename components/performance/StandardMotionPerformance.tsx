"use client";

import { useEffect } from "react";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  getDocumentAnimationMode,
} from "@/lib/animation-preference";

type StandardMotionTier = "full" | "balanced" | "lite";

type NetworkInformationLike = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

type NavigatorWithPerformanceHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

function resolveStandardMotionTier(): StandardMotionTier {
  const runtimeNavigator = navigator as NavigatorWithPerformanceHints;
  const connection = runtimeNavigator.connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const downlink = connection?.downlink;
  const memory = runtimeNavigator.deviceMemory;
  const cores = runtimeNavigator.hardwareConcurrency;
  const compactViewport = window.matchMedia("(max-width: 767px)").matches;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (
    reducedMotion ||
    connection?.saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (typeof downlink === "number" && downlink > 0 && downlink < 1) ||
    (typeof memory === "number" && memory <= 2) ||
    (typeof cores === "number" && cores <= 2)
  ) {
    return "lite";
  }

  if (
    compactViewport ||
    effectiveType === "3g" ||
    (typeof downlink === "number" && downlink > 0 && downlink < 2.5) ||
    (typeof memory === "number" && memory <= 4) ||
    (typeof cores === "number" && cores <= 4)
  ) {
    return "balanced";
  }

  return "full";
}

export default function StandardMotionPerformance() {
  useEffect(() => {
    const root = document.documentElement;
    const runtimeNavigator = navigator as NavigatorWithPerformanceHints;
    const connection = runtimeNavigator.connection;
    const compactViewport = window.matchMedia("(max-width: 767px)");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const clearStandardState = () => {
      delete root.dataset.standardMotionTier;
      delete root.dataset.standardRefreshTier;
      delete root.dataset.standardMotionPressure;
      delete root.dataset.standardPageVisibility;
    };

    const applyStandardState = () => {
      if (getDocumentAnimationMode() !== "standard") {
        clearStandardState();
        return;
      }

      root.dataset.standardMotionTier = resolveStandardMotionTier();
      root.dataset.standardPageVisibility = document.visibilityState;
      delete root.dataset.standardRefreshTier;
      delete root.dataset.standardMotionPressure;
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANIMATION_STORAGE_KEY) return;
      applyStandardState();
    };

    const handleVisibilityChange = () => {
      if (getDocumentAnimationMode() !== "standard") return;
      root.dataset.standardPageVisibility = document.visibilityState;
    };

    applyStandardState();

    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, applyStandardState);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    compactViewport.addEventListener("change", applyStandardState);
    reducedMotion.addEventListener("change", applyStandardState);
    connection?.addEventListener?.("change", applyStandardState);

    return () => {
      window.removeEventListener(ANIMATION_MODE_CHANGE_EVENT, applyStandardState);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      compactViewport.removeEventListener("change", applyStandardState);
      reducedMotion.removeEventListener("change", applyStandardState);
      connection?.removeEventListener?.("change", applyStandardState);
      clearStandardState();
    };
  }, []);

  return null;
}
