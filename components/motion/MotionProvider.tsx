"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import GlobalScrollToTop from "@/components/layout/GlobalScrollToTop";
import { motionEase } from "@/components/motion/animation-config";
import StandardMotionPerformance from "@/components/performance/StandardMotionPerformance";
import {
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  applyAnimationMode,
  getAnimationDurationScale,
  getAnimationPlaybackRate,
  getDocumentAnimationMode,
  getStoredAnimationMode,
  scaleAnimationSeconds,
  type AnimationMode,
} from "@/lib/animation-preference";

function hasDirectText(element: HTMLElement) {
  return Array.from(element.childNodes).some(
    (node) =>
      node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

function isNativeIconTooltipTarget(element: HTMLElement) {
  const isInteractive = element.matches(
    "button, a, [role='button'], [role='link']",
  );
  const hasAccessibleName = element.hasAttribute("aria-label");
  const hasIcon =
    element.matches("svg, img") || Boolean(element.querySelector("svg, img"));
  const isIconOnlyWrapper =
    !isInteractive &&
    hasIcon &&
    element.childElementCount <= 1 &&
    !hasDirectText(element);

  return (isInteractive && (hasAccessibleName || hasIcon)) || isIconOnlyWrapper;
}

function stripNativeIconTitles(root: ParentNode) {
  const titledElements = Array.from(
    root.querySelectorAll<HTMLElement>("[title]"),
  );

  if (root instanceof HTMLElement && root.hasAttribute("title")) {
    titledElements.unshift(root);
  }

  titledElements.forEach((element) => {
    if (isNativeIconTooltipTarget(element)) {
      element.removeAttribute("title");
    }
  });
}

function tuneAnimation(animation: Animation, mode: AnimationMode) {
  if (mode === "none") {
    try {
      const timing = animation.effect?.getComputedTiming();
      if (timing?.iterations === Number.POSITIVE_INFINITY) {
        animation.cancel();
        return;
      }

      animation.finish();
    } catch {
      animation.cancel();
    }
    return;
  }

  try {
    animation.updatePlaybackRate(getAnimationPlaybackRate(mode));
  } catch {}
}

function tuneDocumentAnimations(
  mode: AnimationMode,
  target?: Element,
  subtree = false,
) {
  if (typeof document === "undefined" || !("getAnimations" in document)) return;

  const animations = target
    ? target.getAnimations({ subtree })
    : document.getAnimations();

  animations.forEach((animation) => tuneAnimation(animation, mode));
}

function scaleSvgClockValue(value: string | null, scale: number) {
  if (!value) return value;

  const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return value;

  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue)) return value;

  return `${Math.max(0, numericValue * scale)}${match[2]}`;
}

function tuneSvgAnimationElement(
  element: SVGElement & {
    beginElement?: () => void;
    endElement?: () => void;
  },
  mode: AnimationMode,
) {
  const originalDurationKey = "jfOriginalDuration";
  const originalBeginKey = "jfOriginalBegin";
  const originalRepeatKey = "jfOriginalRepeat";

  if (!(originalDurationKey in element.dataset)) {
    element.dataset[originalDurationKey] = element.getAttribute("dur") ?? "";
  }
  if (!(originalBeginKey in element.dataset)) {
    element.dataset[originalBeginKey] = element.getAttribute("begin") ?? "";
  }
  if (!(originalRepeatKey in element.dataset)) {
    element.dataset[originalRepeatKey] = element.getAttribute("repeatCount") ?? "";
  }

  const originalDuration = element.dataset[originalDurationKey] || null;
  const originalBegin = element.dataset[originalBeginKey] || null;
  const originalRepeat = element.dataset[originalRepeatKey] || null;

  if (mode === "none") {
    element.setAttribute("dur", "0s");
    element.setAttribute("begin", "0s");
    element.setAttribute("repeatCount", "1");
    try {
      element.endElement?.();
    } catch {}
    return;
  }

  const scale = getAnimationDurationScale(mode);
  const duration = scaleSvgClockValue(originalDuration, scale);
  const begin = scaleSvgClockValue(originalBegin, scale);

  if (duration) element.setAttribute("dur", duration);
  else element.removeAttribute("dur");

  if (begin) element.setAttribute("begin", begin);
  else element.removeAttribute("begin");

  if (originalRepeat) element.setAttribute("repeatCount", originalRepeat);
  else element.removeAttribute("repeatCount");
}

function tuneSvgAnimations(root: ParentNode, mode: AnimationMode) {
  const selector = "animate, animateTransform, animateMotion";
  const elements = Array.from(
    root.querySelectorAll<SVGElement>(selector),
  );

  if (root instanceof SVGElement && root.matches(selector)) {
    elements.unshift(root);
  }

  elements.forEach((element) =>
    tuneSvgAnimationElement(
      element as SVGElement & {
        beginElement?: () => void;
        endElement?: () => void;
      },
      mode,
    ),
  );
}

export default function MotionProvider({ children }: { children: ReactNode }) {
  const [animationMode, setAnimationMode] = useState<AnimationMode>(() =>
    getDocumentAnimationMode(),
  );

  useEffect(() => {
    stripNativeIconTitles(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof HTMLElement) {
            stripNativeIconTitles(mutation.target);
          }
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            stripNativeIconTitles(node);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let activeMode = getStoredAnimationMode();
    let runtimeObserver: MutationObserver | null = null;
    let runtimeListenersAttached = false;
    let pendingFrame: number | null = null;
    let restoreFrame: number | null = null;
    const pendingRoots = new Set<Element>();

    const flushPendingRoots = () => {
      pendingFrame = null;
      const roots = Array.from(pendingRoots).filter(
        (root) =>
          root.isConnected &&
          !Array.from(pendingRoots).some(
            (candidate) => candidate !== root && candidate.contains(root),
          ),
      );
      pendingRoots.clear();

      roots.forEach((root) => {
        tuneSvgAnimations(root, activeMode);
        tuneDocumentAnimations(activeMode, root, true);
      });
    };

    const scheduleRootTuning = (root: Element) => {
      if (activeMode !== "fast") return;

      pendingRoots.add(root);
      if (pendingFrame === null) {
        pendingFrame = window.requestAnimationFrame(flushPendingRoots);
      }
    };

    const handleAnimationStart = (event: Event) => {
      if (activeMode !== "fast") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      queueMicrotask(() => tuneDocumentAnimations(activeMode, target));
    };

    const attachRuntimeTuning = () => {
      if (activeMode !== "fast" || runtimeObserver) return;

      runtimeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) scheduleRootTuning(node);
          });
        });
      });

      runtimeObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });

      if (!runtimeListenersAttached) {
        runtimeListenersAttached = true;
        document.addEventListener("animationstart", handleAnimationStart, true);
      }
    };

    const detachRuntimeTuning = () => {
      runtimeObserver?.disconnect();
      runtimeObserver = null;
      pendingRoots.clear();

      if (pendingFrame !== null) {
        window.cancelAnimationFrame(pendingFrame);
        pendingFrame = null;
      }

      if (runtimeListenersAttached) {
        runtimeListenersAttached = false;
        document.removeEventListener("animationstart", handleAnimationStart, true);
      }
    };

    const synchronizeMode = (nextMode: AnimationMode) => {
      const previousMode = activeMode;
      const mode = applyAnimationMode(nextMode, {
        persist: false,
        broadcast: false,
      });

      activeMode = mode;
      setAnimationMode(mode);

      if (restoreFrame !== null) {
        window.cancelAnimationFrame(restoreFrame);
        restoreFrame = null;
      }

      // A full scan is only needed when entering an accelerated mode or restoring
      // animations after one. Standard-to-standard stays zero-overhead.
      if (mode !== "standard" || previousMode !== "standard") {
        tuneDocumentAnimations(mode);
        tuneSvgAnimations(document, mode);
      }

      // Fast keeps one batched mutation pass so newly authored animations inherit
      // its playback rate. None relies on CSS, reduced motion and two bounded scans
      // instead of continuously observing every DOM mutation.
      if (mode === "fast") attachRuntimeTuning();
      else detachRuntimeTuning();

      if (
        previousMode !== mode &&
        (previousMode === "none" || mode === "none")
      ) {
        restoreFrame = window.requestAnimationFrame(() => {
          restoreFrame = null;
          tuneDocumentAnimations(mode);
          tuneSvgAnimations(document, mode);
        });
      }
    };

    const handlePreferenceChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AnimationMode>).detail;
      synchronizeMode(nextMode ?? getStoredAnimationMode());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANIMATION_STORAGE_KEY) return;
      synchronizeMode(getStoredAnimationMode());
    };

    synchronizeMode(activeMode);
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      detachRuntimeTuning();
      if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
      window.removeEventListener(ANIMATION_MODE_CHANGE_EVENT, handlePreferenceChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <MotionConfig
      reducedMotion={
        animationMode === "none"
          ? "always"
          : animationMode === "fast"
            ? "never"
            : "user"
      }
      transition={{
        duration: scaleAnimationSeconds(0.22, animationMode),
        ease: motionEase,
      }}
    >
      <StandardMotionPerformance />
      {children}
      {/* Route-wide overlay handles both document and dashboard scroll containers. */}
      <GlobalScrollToTop />
    </MotionConfig>
  );
}
