"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import GlobalScrollToTop from "@/components/layout/GlobalScrollToTop";
import { motionEase } from "@/components/motion/animation-config";
import {
  ANIMATION_MODE_CHANGE_EVENT,
  applyAnimationMode,
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
    const synchronizeMode = (nextMode: AnimationMode) => {
      const mode = applyAnimationMode(nextMode, {
        persist: false,
        broadcast: false,
      });
      setAnimationMode(mode);
      tuneDocumentAnimations(mode);
    };

    const handlePreferenceChange = (event: Event) => {
      const nextMode = (event as CustomEvent<AnimationMode>).detail;
      synchronizeMode(nextMode ?? getStoredAnimationMode());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== "jamal-animation-mode") return;
      synchronizeMode(getStoredAnimationMode());
    };

    const handleAnimationStart = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      queueMicrotask(() => tuneDocumentAnimations(getDocumentAnimationMode(), target));
    };

    synchronizeMode(getStoredAnimationMode());
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, handlePreferenceChange);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("animationstart", handleAnimationStart, true);
    document.addEventListener("transitionrun", handleAnimationStart, true);

    return () => {
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
