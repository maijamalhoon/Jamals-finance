"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { motionDurations, motionEase } from "@/components/motion/animation-config";

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

export default function MotionProvider({ children }: { children: ReactNode }) {
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

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: motionDurations.base, ease: motionEase }}
    >
      {children}
    </MotionConfig>
  );
}
