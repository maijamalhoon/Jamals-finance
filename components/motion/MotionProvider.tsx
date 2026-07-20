"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import GlobalScrollToTop from "@/components/layout/GlobalScrollToTop";
import { motionEase } from "@/components/motion/animation-config";
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
  try {
    if (mode === "none") {
      animation.finish();
      return;
    }

    animation.updatePlaybackRate(getAnimationPlaybackRate(mode));
  } catch {}
}

function tuneDocumentAnimations(mode: AnimationMode, target?: Element) {
  if (typeof document === "undefined" || !("getAnimations" in document)) return;

  const animations = target
    ? target.getAnimations({ subtree: false })
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

    const synchronizeMode = (nextMode: AnimationMode) => {
      const mode = applyAnimationMode(nextMode, {
        persist: false,
        broadcast: false,
      });
      activeMode = mode;
      setAnimationMode(mode);
      tuneDocumentAnimations(mode);
      tuneSvgAnimations(document, mode);
    };

    const handlePreferenceChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AnimationMode>).detail;
      synchronizeMode(nextMode ?? getStoredAnimationMode());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANIMATION_STORAGE_KEY) return;
      synchronizeMode(getStoredAnimationMode());
    };

    const handleAnimationStart = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      queueMicrotask(() => tuneDocumentAnimations(activeMode, target));
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          tuneSvgAnimations(node, activeMode);
          queueMicrotask(() => tuneDocumentAnimations(activeMode, node));
        });
      });
    });

    synchronizeMode(activeMode);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("animationstart", handleAnimationStart, true);
    document.addEventListener("transitionrun", handleAnimationStart, true);

    return () => {
      observer.disconnect();
      window.removeEventListener(ANIMATION_MODE_CHANGE_EVENT, handlePreferenceChange);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("animationstart", handleAnimationStart, true);
      document.removeEventListener("transitionrun", handleAnimationStart, true);
    };
  }, []);

  return (
    <MotionConfig
      reducedMotion={animationMode === "none" ? "always" : "user"}
      transition={{
        duration: scaleAnimationSeconds(0.22, animationMode),
        ease: motionEase,
      }}
    >
      {children}
      {/* Route-wide overlay handles both document and dashboard scroll containers. */}
      <GlobalScrollToTop />
    </MotionConfig>
  );
}
