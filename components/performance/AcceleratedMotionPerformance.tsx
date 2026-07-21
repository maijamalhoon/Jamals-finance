"use client";

import { useEffect } from "react";

import {
  ANIMATION_MODE_CHANGE_EVENT,
  getDocumentAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

type FastMotionTier = "full" | "balanced" | "lite";

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

const ESSENTIAL_MOTION_SELECTOR = [
  '[aria-busy="true"]',
  '[role="progressbar"]',
  '[data-fast-animation-route-loading="true"]',
].join(",");

const CONTINUOUS_SVG_SELECTOR = [
  'animate[repeatCount="indefinite"]',
  'animateMotion[repeatCount="indefinite"]',
  'animateTransform[repeatCount="indefinite"]',
].join(",");

function getInitialFastTier(): FastMotionTier {
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

function downgradeTier(tier: FastMotionTier): FastMotionTier {
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

function resolveNoAnimationState() {
  if (!("getAnimations" in document)) return;

  document.getAnimations().forEach((animation) => {
    try {
      const iterations = animation.effect?.getComputedTiming().iterations;
      if (iterations === Number.POSITIVE_INFINITY) animation.cancel();
      else animation.finish();
    } catch {
      animation.cancel();
    }
  });
}

export default function AcceleratedMotionPerformance() {
  useEffect(() => {
    const root = document.documentElement;
    let activeMode: AnimationMode = getDocumentAnimationMode();
    let fastActive = false;
    let tier: FastMotionTier = "full";
    let initialScanIdleHandle: number | null = null;
    let initialScanTimeoutHandle: ReturnType<typeof globalThis.setTimeout> | null =
      null;
    let samplingStartHandle: ReturnType<typeof globalThis.setTimeout> | null =
      null;
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
      if (!fastActive || animationTargets.has(animation)) return;
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
      if (!fastActive || trackedSvgs.has(svg)) return;
      if (!svg.querySelector(CONTINUOUS_SVG_SELECTOR)) return;

      trackedSvgs.add(svg);
      svgVisibility.set(svg, isNearViewport(svg));
      intersectionObserver?.observe(svg);
      updateSvg(svg);
    };

    const scanSvgRoot = (scanRoot: ParentNode) => {
      if (!fastActive) return;

      if (scanRoot instanceof SVGSVGElement) trackSvg(scanRoot);
      scanRoot.querySelectorAll<SVGSVGElement>("svg").forEach(trackSvg);
    };

    const scanInitialMotion = () => {
      if (!fastActive) return;
      if ("getAnimations" in document) {
        document.getAnimations().forEach(trackAnimation);
      }
      scanSvgRoot(document);
    };

    const cancelInitialScan = () => {
      if (
        initialScanIdleHandle !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(initialScanIdleHandle);
      }
      if (initialScanTimeoutHandle !== null) {
        globalThis.clearTimeout(initialScanTimeoutHandle);
      }
      initialScanIdleHandle = null;
      initialScanTimeoutHandle = null;
    };

    const scheduleInitialScan = () => {
      cancelInitialScan();

      const scan = () => {
        initialScanIdleHandle = null;
        initialScanTimeoutHandle = null;
        scanInitialMotion();
      };

      if (typeof window.requestIdleCallback === "function") {
        initialScanIdleHandle = window.requestIdleCallback(scan, { timeout: 600 });
      } else {
        initialScanTimeoutHandle = globalThis.setTimeout(scan, 40);
      }
    };

    const applyTier = (nextTier: FastMotionTier) => {
      if (tier === nextTier && root.dataset.fastMotionTier === nextTier) return;

      tier = nextTier;
      root.dataset.fastMotionTier = nextTier;
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
      const p90 = ordered[Math.floor(ordered.length * 0.9)] ?? median;

      if (median > 22 || p90 > 34) applyTier("lite");
      else if ((median > 18 || p90 > 27) && tier === "full") {
        applyTier("balanced");
      }
    };

    const sampleFrameRate = (time: number) => {
      if (!fastActive) return;

      if (previousFrameTime > 0) frameDurations.push(time - previousFrameTime);
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
            if (entry.duration >= 70) longTaskCount += 1;
          });

          if (longTaskCount >= 3) {
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
        if (fastActive) startRuntimeSampling();
      }, 750);
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
      if (!fastActive || !(event.target instanceof Element)) return;
      const target = event.target;

      queueMicrotask(() => {
        if (!fastActive || !("getAnimations" in target)) return;
        target.getAnimations({ subtree: false }).forEach(trackAnimation);
      });
    };

    const handleVisibilityChange = () => {
      root.dataset.fastPageVisibility = document.visibilityState;
      updateAllMotion();
    };

    const flushSvgRoots = () => {
      mutationFrame = 0;
      const roots = Array.from(pendingSvgRoots);
      pendingSvgRoots.clear();
      roots.forEach(scanSvgRoot);
    };

    const attachFastRuntime = () => {
      if (fastActive) return;
      fastActive = true;
      root.dataset.fastMotionRuntime = "active";
      root.dataset.fastPageVisibility = document.visibilityState;
      applyTier(getInitialFastTier());

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

    const detachFastRuntime = () => {
      if (!fastActive) return;
      fastActive = false;
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
      delete root.dataset.fastMotionRuntime;
      delete root.dataset.fastMotionTier;
      delete root.dataset.fastPageVisibility;
    };

    const synchronizeMode = (nextMode: AnimationMode) => {
      activeMode = nextMode;

      if (activeMode === "fast") {
        delete root.dataset.noneMotionRuntime;
        attachFastRuntime();
        return;
      }

      detachFastRuntime();

      if (activeMode === "none") {
        root.dataset.noneMotionRuntime = "static";
        resolveNoAnimationState();
      } else {
        delete root.dataset.noneMotionRuntime;
      }
    };

    const handleModeChange = (event: Event) => {
      const nextMode =
        (event as CustomEvent<AnimationMode>).detail ??
        getDocumentAnimationMode();
      synchronizeMode(nextMode);
    };

    synchronizeMode(activeMode);
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, handleModeChange);

    return () => {
      detachFastRuntime();
      delete root.dataset.noneMotionRuntime;
      window.removeEventListener(ANIMATION_MODE_CHANGE_EVENT, handleModeChange);
    };
  }, []);

  return null;
}
