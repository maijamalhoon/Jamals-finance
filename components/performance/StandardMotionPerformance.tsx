"use client";

import { useEffect } from "react";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

type StandardMotionTier = "full" | "balanced" | "lite";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

type NavigatorWithPerformanceHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

type PausableSvg = SVGSVGElement & {
  pauseAnimations?: () => void;
  unpauseAnimations?: () => void;
};

const CONTINUOUS_SVG_SELECTOR = [
  'animate[repeatCount="indefinite"]',
  'animateMotion[repeatCount="indefinite"]',
  'animateTransform[repeatCount="indefinite"]',
].join(",");

const ESSENTIAL_MOTION_SELECTOR = [
  '[aria-busy="true"]',
  '[role="progressbar"]',
  '[data-standard-animation-route-loading="true"]',
].join(",");

function getInitialStandardMotionTier(): StandardMotionTier {
  const runtimeNavigator = navigator as NavigatorWithPerformanceHints;
  const connection = runtimeNavigator.connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const downlink = connection?.downlink;
  const memory = runtimeNavigator.deviceMemory;
  const cores = runtimeNavigator.hardwareConcurrency;
  const slowDisplay = window.matchMedia("(update: slow)").matches;

  if (
    connection?.saveData === true ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (downlink !== undefined && downlink < 1.5) ||
    (memory !== undefined && memory <= 2) ||
    (cores > 0 && cores <= 2) ||
    slowDisplay
  ) {
    return "lite";
  }

  if (
    effectiveType === "3g" ||
    (downlink !== undefined && downlink < 4) ||
    (memory !== undefined && memory <= 4) ||
    (cores > 0 && cores <= 4)
  ) {
    return "balanced";
  }

  return "full";
}

function downgradeTier(tier: StandardMotionTier): StandardMotionTier {
  if (tier === "full") return "balanced";
  return "lite";
}

function getAnimationTarget(animation: Animation) {
  const effect = animation.effect;
  if (!effect || !("target" in effect)) return null;

  const target = (effect as KeyframeEffect).target;
  return target instanceof Element ? target : null;
}

function isContinuousAnimation(animation: Animation) {
  try {
    return (
      animation.effect?.getComputedTiming().iterations ===
      Number.POSITIVE_INFINITY
    );
  } catch {
    return false;
  }
}

function isNearViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  const margin = 96;

  return (
    rect.bottom >= -margin &&
    rect.right >= -margin &&
    rect.top <= window.innerHeight + margin &&
    rect.left <= window.innerWidth + margin
  );
}

function isEssentialMotion(element: Element) {
  return Boolean(element.closest(ESSENTIAL_MOTION_SELECTOR));
}

export default function StandardMotionPerformance() {
  useEffect(() => {
    const root = document.documentElement;
    let active = false;
    let tier: StandardMotionTier = "full";
    let idleHandle: number | null = null;
    let fallbackHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
    let samplingStartHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
    let sampleFrame = 0;
    let previousFrameTime = 0;
    let longTaskCount = 0;
    let longTaskWindowStartedAt = performance.now();
    let mutationFrame = 0;
    let mutationObserver: MutationObserver | null = null;
    let longTaskObserver: PerformanceObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const frameDurations: number[] = [];
    const elementAnimations = new Map<Element, Set<Animation>>();
    const animationTargets = new Map<Animation, Element>();
    const pausedAnimations = new Set<Animation>();
    const elementVisibility = new WeakMap<Element, boolean>();
    const trackedSvgs = new Set<PausableSvg>();
    const svgVisibility = new WeakMap<PausableSvg, boolean>();
    const pendingSvgRoots = new Set<Element>();

    const shouldRunElementMotion = (element: Element) => {
      if (document.visibilityState !== "visible") return false;
      if (elementVisibility.get(element) === false) return false;
      if (tier === "lite" && !isEssentialMotion(element)) return false;
      return true;
    };

    const pauseAnimation = (animation: Animation) => {
      if (animation.playState !== "running") return;

      try {
        animation.pause();
        pausedAnimations.add(animation);
      } catch {}
    };

    const resumeAnimation = (animation: Animation) => {
      if (!pausedAnimations.has(animation)) return;
      pausedAnimations.delete(animation);

      try {
        animation.play();
      } catch {}
    };

    const updateElementAnimations = (element: Element) => {
      const animations = elementAnimations.get(element);
      if (!animations) return;

      const shouldRun = shouldRunElementMotion(element);
      animations.forEach((animation) => {
        if (shouldRun) resumeAnimation(animation);
        else pauseAnimation(animation);
      });
    };

    const updateSvg = (svg: PausableSvg) => {
      const shouldRun =
        document.visibilityState === "visible" &&
        svgVisibility.get(svg) !== false &&
        (tier !== "lite" || isEssentialMotion(svg));

      try {
        if (shouldRun) svg.unpauseAnimations?.();
        else svg.pauseAnimations?.();
      } catch {}
    };

    const updateAllMotion = () => {
      elementAnimations.forEach((_, element) => updateElementAnimations(element));
      trackedSvgs.forEach(updateSvg);
    };

    const cleanupAnimation = (animation: Animation) => {
      const target = animationTargets.get(animation);
      if (!target) return;

      animationTargets.delete(animation);
      pausedAnimations.delete(animation);
      const animations = elementAnimations.get(target);
      animations?.delete(animation);

      if (animations?.size === 0) {
        elementAnimations.delete(target);
        intersectionObserver?.unobserve(target);
      }
    };

    const trackAnimation = (animation: Animation) => {
      if (!active || animationTargets.has(animation)) return;
      if (!isContinuousAnimation(animation)) return;

      const target = getAnimationTarget(animation);
      if (!target) return;

      animationTargets.set(animation, target);
      let animations = elementAnimations.get(target);
      if (!animations) {
        animations = new Set<Animation>();
        elementAnimations.set(target, animations);
        elementVisibility.set(target, isNearViewport(target));
        intersectionObserver?.observe(target);
      }
      animations.add(animation);

      animation.addEventListener("finish", () => cleanupAnimation(animation), {
        once: true,
      });
      animation.addEventListener("cancel", () => cleanupAnimation(animation), {
        once: true,
      });

      updateElementAnimations(target);
    };

    const trackSvg = (svg: PausableSvg) => {
      if (!active || trackedSvgs.has(svg)) return;
      if (!svg.querySelector(CONTINUOUS_SVG_SELECTOR)) return;

      trackedSvgs.add(svg);
      svgVisibility.set(svg, isNearViewport(svg));
      intersectionObserver?.observe(svg);
      updateSvg(svg);
    };

    const scanSvgRoot = (scanRoot: ParentNode) => {
      if (!active) return;

      if (scanRoot instanceof SVGSVGElement) trackSvg(scanRoot);
      scanRoot.querySelectorAll<SVGSVGElement>("svg").forEach(trackSvg);
    };

    const scanInitialMotion = () => {
      if (!active) return;
      if ("getAnimations" in document) {
        document.getAnimations().forEach(trackAnimation);
      }
      scanSvgRoot(document);
    };

    const scheduleInitialScan = () => {
      const scan = () => {
        idleHandle = null;
        fallbackHandle = null;
        scanInitialMotion();
      };

      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(scan, { timeout: 700 });
      } else {
        fallbackHandle = globalThis.setTimeout(scan, 48);
      }
    };

    const cancelInitialScan = () => {
      if (
        idleHandle !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleHandle);
      }
      if (fallbackHandle !== null) globalThis.clearTimeout(fallbackHandle);
      idleHandle = null;
      fallbackHandle = null;
    };

    const applyTier = (nextTier: StandardMotionTier) => {
      if (tier === nextTier && root.dataset.standardMotionTier === nextTier) {
        return;
      }

      tier = nextTier;
      root.dataset.standardMotionTier = nextTier;
      updateAllMotion();
    };

    const downgradeForRuntimePressure = () => {
      const nextTier = downgradeTier(tier);
      if (nextTier !== tier) applyTier(nextTier);
    };

    const finishFrameSampling = () => {
      if (frameDurations.length === 0) return;
      const ordered = [...frameDurations].sort((a, b) => a - b);
      const median = ordered[Math.floor(ordered.length / 2)] ?? 0;

      if (median > 24) applyTier("lite");
      else if (median > 18.5 && tier === "full") applyTier("balanced");
    };

    const sampleFrameRate = (time: number) => {
      if (!active) return;

      if (previousFrameTime > 0) {
        frameDurations.push(time - previousFrameTime);
      }
      previousFrameTime = time;

      if (frameDurations.length >= 24) {
        sampleFrame = 0;
        finishFrameSampling();
        return;
      }

      sampleFrame = window.requestAnimationFrame(sampleFrameRate);
    };

    const startRuntimeSampling = () => {
      frameDurations.length = 0;
      previousFrameTime = 0;
      sampleFrame = window.requestAnimationFrame(sampleFrameRate);

      if (
        typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes?.includes("longtask")
      ) {
        longTaskObserver = new PerformanceObserver((list) => {
          const now = performance.now();
          if (now - longTaskWindowStartedAt > 8_000) {
            longTaskWindowStartedAt = now;
            longTaskCount = 0;
          }

          list.getEntries().forEach((entry) => {
            if (entry.duration >= 80) longTaskCount += 1;
          });

          if (longTaskCount >= 4) {
            longTaskCount = 0;
            longTaskWindowStartedAt = now;
            downgradeForRuntimePressure();
          }
        });

        try {
          longTaskObserver.observe({ entryTypes: ["longtask"] });
        } catch {
          longTaskObserver.disconnect();
          longTaskObserver = null;
        }
      }
    };

    const scheduleRuntimeSampling = () => {
      samplingStartHandle = globalThis.setTimeout(() => {
        samplingStartHandle = null;
        if (active) startRuntimeSampling();
      }, 900);
    };

    const stopRuntimeSampling = () => {
      if (samplingStartHandle !== null) {
        globalThis.clearTimeout(samplingStartHandle);
        samplingStartHandle = null;
      }
      if (sampleFrame) window.cancelAnimationFrame(sampleFrame);
      sampleFrame = 0;
      longTaskObserver?.disconnect();
      longTaskObserver = null;
    };

    const handleAnimationStart = (event: Event) => {
      if (!active || !(event.target instanceof Element)) return;
      const target = event.target;

      queueMicrotask(() => {
        if (!active || !("getAnimations" in target)) return;
        target.getAnimations({ subtree: false }).forEach(trackAnimation);
      });
    };

    const handleVisibilityChange = () => {
      root.dataset.pageVisibility = document.visibilityState;
      updateAllMotion();
    };

    const flushSvgRoots = () => {
      mutationFrame = 0;
      const roots = Array.from(pendingSvgRoots);
      pendingSvgRoots.clear();
      roots.forEach(scanSvgRoot);
    };

    const attachStandardRuntime = () => {
      if (active) return;
      active = true;
      root.dataset.standardMotionRuntime = "active";
      root.dataset.pageVisibility = document.visibilityState;
      applyTier(getInitialStandardMotionTier());

      if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const target = entry.target;
              const visible =
                entry.isIntersecting || entry.intersectionRatio > 0;

              if (target instanceof SVGSVGElement && trackedSvgs.has(target)) {
                svgVisibility.set(target, visible);
                updateSvg(target);
              }

              if (elementAnimations.has(target)) {
                elementVisibility.set(target, visible);
                updateElementAnimations(target);
              }
            });
          },
          { rootMargin: "96px" },
        );
      }

      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (
              node instanceof SVGSVGElement ||
              node.matches(CONTINUOUS_SVG_SELECTOR) ||
              node.querySelector(CONTINUOUS_SVG_SELECTOR)
            ) {
              pendingSvgRoots.add(node);
            }
          });
        });

        if (pendingSvgRoots.size > 0 && mutationFrame === 0) {
          mutationFrame = window.requestAnimationFrame(flushSvgRoots);
        }
      });
      mutationObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });

      document.addEventListener("animationstart", handleAnimationStart, true);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      scheduleInitialScan();
      scheduleRuntimeSampling();
    };

    const detachStandardRuntime = () => {
      if (!active) return;
      active = false;
      cancelInitialScan();
      stopRuntimeSampling();
      mutationObserver?.disconnect();
      mutationObserver = null;
      intersectionObserver?.disconnect();
      intersectionObserver = null;
      if (mutationFrame) window.cancelAnimationFrame(mutationFrame);
      mutationFrame = 0;
      pendingSvgRoots.clear();
      document.removeEventListener("animationstart", handleAnimationStart, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      pausedAnimations.forEach((animation) => {
        try {
          animation.play();
        } catch {}
      });
      trackedSvgs.forEach((svg) => {
        try {
          svg.unpauseAnimations?.();
        } catch {}
      });

      pausedAnimations.clear();
      trackedSvgs.clear();
      elementAnimations.clear();
      animationTargets.clear();
      delete root.dataset.standardMotionRuntime;
      delete root.dataset.standardMotionTier;
      delete root.dataset.pageVisibility;
    };

    const handleAnimationModeChange = (event: Event) => {
      const nextMode =
        (event as CustomEvent<AnimationMode>).detail ??
        getDocumentAnimationMode();

      if (nextMode === "standard") attachStandardRuntime();
      else detachStandardRuntime();
    };

    if (getDocumentAnimationMode() === "standard") attachStandardRuntime();
    window.addEventListener(
      ANIMATION_MODE_CHANGE_EVENT,
      handleAnimationModeChange,
    );

    return () => {
      detachStandardRuntime();
      window.removeEventListener(
        ANIMATION_MODE_CHANGE_EVENT,
        handleAnimationModeChange,
      );
    };
  }, []);

  return null;
}
