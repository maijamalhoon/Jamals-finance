"use client";

import { useEffect } from "react";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

type StandardMotionTier = "full" | "balanced" | "lite";
type StandardRefreshTier = "high" | "normal" | "low";

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

function getInitialStandardMotionTier(): StandardMotionTier {
  const runtimeNavigator = navigator as NavigatorWithPerformanceHints;
  const connection = runtimeNavigator.connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const downlink = connection?.downlink;
  const memory = runtimeNavigator.deviceMemory;
  const cores = runtimeNavigator.hardwareConcurrency;
  const slowDisplay = window.matchMedia?.("(update: slow)").matches === true;

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
  const margin = 160;

  return (
    rect.bottom >= -margin &&
    rect.right >= -margin &&
    rect.top <= window.innerHeight + margin &&
    rect.left <= window.innerWidth + margin
  );
}

function getRefreshTier(medianFrameMs: number): StandardRefreshTier {
  if (medianFrameMs > 0 && medianFrameMs <= 10.5) return "high";
  if (medianFrameMs > 18.5) return "low";
  return "normal";
}

function collectContinuousSvgRoots(root: ParentNode) {
  const svgRoots = new Set<PausableSvg>();

  if (
    root instanceof SVGSVGElement &&
    root.querySelector(CONTINUOUS_SVG_SELECTOR)
  ) {
    svgRoots.add(root);
  }

  root
    .querySelectorAll<SVGElement>(CONTINUOUS_SVG_SELECTOR)
    .forEach((motionNode) => {
      const svg = motionNode.closest("svg");
      if (svg instanceof SVGSVGElement) svgRoots.add(svg);
    });

  return svgRoots;
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
    let slowInteractionCount = 0;
    let pressureWindowStartedAt = performance.now();
    let mutationFrame = 0;
    let mutationObserver: MutationObserver | null = null;
    let longTaskObserver: PerformanceObserver | null = null;
    let eventTimingObserver: PerformanceObserver | null = null;
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
      return elementVisibility.get(element) !== false;
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
        svgVisibility.get(svg) !== false;

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

    const pruneDisconnectedMotion = () => {
      elementAnimations.forEach((animations, element) => {
        if (element.isConnected) return;
        animations.forEach(cleanupAnimation);
      });

      trackedSvgs.forEach((svg) => {
        if (svg.isConnected) return;
        trackedSvgs.delete(svg);
        intersectionObserver?.unobserve(svg);
      });
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
      collectContinuousSvgRoots(scanRoot).forEach(trackSvg);
    };

    const scanInitialMotion = () => {
      if (!active) return;
      if ("getAnimations" in document) {
        document.getAnimations().forEach(trackAnimation);
      }
      scanSvgRoot(document);
      pruneDisconnectedMotion();
    };

    const scheduleInitialScan = () => {
      const scan = () => {
        idleHandle = null;
        fallbackHandle = null;
        scanInitialMotion();
      };

      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(scan, { timeout: 650 });
      } else {
        fallbackHandle = globalThis.setTimeout(scan, 40);
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
    };

    const downgradeForRuntimePressure = () => {
      const nextTier = downgradeTier(tier);
      if (nextTier !== tier) applyTier(nextTier);
    };

    const finishFrameSampling = () => {
      if (frameDurations.length === 0) return;
      const ordered = [...frameDurations].sort((a, b) => a - b);
      const median = ordered[Math.floor(ordered.length / 2)] ?? 0;
      const p90 = ordered[Math.floor(ordered.length * 0.9)] ?? median;

      root.dataset.standardRefreshTier = getRefreshTier(median);

      if (median > 25 || p90 > 42) applyTier("lite");
      else if ((median > 18.5 || p90 > 29) && tier === "full") {
        applyTier("balanced");
      }
    };

    const sampleFrameRate = (time: number) => {
      if (!active || document.visibilityState !== "visible") return;

      if (previousFrameTime > 0) {
        frameDurations.push(time - previousFrameTime);
      }
      previousFrameTime = time;

      if (frameDurations.length >= 48) {
        sampleFrame = 0;
        finishFrameSampling();
        return;
      }

      sampleFrame = window.requestAnimationFrame(sampleFrameRate);
    };

    const startFrameSampling = () => {
      if (!active || document.visibilityState !== "visible") return;
      if (sampleFrame) window.cancelAnimationFrame(sampleFrame);
      frameDurations.length = 0;
      previousFrameTime = 0;
      sampleFrame = window.requestAnimationFrame(sampleFrameRate);
    };

    const recordRuntimePressure = (kind: "longtask" | "interaction") => {
      const now = performance.now();
      if (now - pressureWindowStartedAt > 8_000) {
        pressureWindowStartedAt = now;
        longTaskCount = 0;
        slowInteractionCount = 0;
      }

      if (kind === "longtask") longTaskCount += 1;
      else slowInteractionCount += 1;

      if (longTaskCount >= 3 || slowInteractionCount >= 3) {
        longTaskCount = 0;
        slowInteractionCount = 0;
        pressureWindowStartedAt = now;
        downgradeForRuntimePressure();
      }
    };

    const startPressureObservers = () => {
      if (typeof PerformanceObserver === "undefined") return;

      if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration >= 70) recordRuntimePressure("longtask");
          });
        });

        try {
          longTaskObserver.observe({ entryTypes: ["longtask"] });
        } catch {
          longTaskObserver.disconnect();
          longTaskObserver = null;
        }
      }

      if (PerformanceObserver.supportedEntryTypes?.includes("event")) {
        eventTimingObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration >= 80) recordRuntimePressure("interaction");
          });
        });

        try {
          eventTimingObserver.observe({
            type: "event",
            buffered: true,
            durationThreshold: 50,
          } as PerformanceObserverInit & { durationThreshold: number });
        } catch {
          eventTimingObserver.disconnect();
          eventTimingObserver = null;
        }
      }
    };

    const scheduleRuntimeSampling = () => {
      if (samplingStartHandle !== null) {
        globalThis.clearTimeout(samplingStartHandle);
      }

      samplingStartHandle = globalThis.setTimeout(() => {
        samplingStartHandle = null;
        if (active) startFrameSampling();
      }, 650);
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
      eventTimingObserver?.disconnect();
      eventTimingObserver = null;
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

      if (document.visibilityState === "visible") {
        scheduleRuntimeSampling();
      }
    };

    const flushSvgRoots = () => {
      mutationFrame = 0;
      const roots = Array.from(pendingSvgRoots).filter(
        (candidate) =>
          candidate.isConnected &&
          !Array.from(pendingSvgRoots).some(
            (other) => other !== candidate && other.contains(candidate),
          ),
      );
      pendingSvgRoots.clear();
      roots.forEach(scanSvgRoot);
      pruneDisconnectedMotion();
    };

    const queueSvgRoot = (node: Element) => {
      if (node instanceof SVGSVGElement) {
        pendingSvgRoots.add(node);
        return;
      }

      if (node.matches(CONTINUOUS_SVG_SELECTOR)) {
        const svg = node.closest("svg");
        if (svg instanceof SVGSVGElement) pendingSvgRoots.add(svg);
        return;
      }

      if (node.querySelector(CONTINUOUS_SVG_SELECTOR)) {
        pendingSvgRoots.add(node);
      }
    };

    const attachStandardRuntime = () => {
      if (active) return;
      active = true;
      root.dataset.standardMotionRuntime = "active";
      root.dataset.standardVisibleMotion = "preserved";
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
          { rootMargin: "160px" },
        );
      }

      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) queueSvgRoot(node);
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
      startPressureObservers();
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
      delete root.dataset.standardVisibleMotion;
      delete root.dataset.standardMotionTier;
      delete root.dataset.standardRefreshTier;
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
