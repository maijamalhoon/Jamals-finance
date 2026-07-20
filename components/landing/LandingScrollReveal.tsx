"use client";

import { useEffect } from "react";
import {
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  getDocumentAnimationMode,
} from "@/lib/animation-preference";

const REVEAL_SELECTORS = [
  ".jf-reveal:not(.jf-insights-copy):not(.jf-footer-nav)",
  ".jf-hero-copy > .jf-hero-badge",
  ".jf-hero-copy > h1",
  ".jf-hero-copy > .jf-hero-description",
  ".jf-hero-copy > .jf-hero-actions",
  ".jf-hero-copy > .jf-hero-proof",
  ".jf-preview-topbar",
  ".jf-preview-balance",
  ".jf-preview-metrics > div",
  ".jf-chart-panel",
  ".jf-activity-panel",
  ".jf-insights-copy > .jf-section-heading",
  ".jf-insight-points > span",
  ".jf-footer-nav > div",
].join(",");

const STAGGER_GROUPS = [
  ".jf-hero-copy > *",
  ".jf-preview-metrics > div",
  ".jf-value-item",
  ".jf-feature",
  ".jf-insight-points > span",
  ".jf-workflow-step",
  ".jf-privacy-item",
  ".jf-footer-nav > div",
];

const CARD_SELECTORS = [
  ".jf-preview-balance",
  ".jf-preview-metrics > div",
  ".jf-chart-panel",
  ".jf-activity-panel",
  ".jf-value-item",
  ".jf-feature",
  ".jf-insight-visual",
  ".jf-workflow-step",
  ".jf-privacy-item",
  ".jf-final-cta",
].join(",");

const MAX_STAGGER_ORDER = 6;

type ScrollDirection = "up" | "down";

export default function LandingScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".jf-node4-landing");
    if (!root) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const revealItems = Array.from(
      new Set(root.querySelectorAll<HTMLElement>(REVEAL_SELECTORS)),
    );

    revealItems.forEach((element) => {
      element.dataset.landingReveal = "";
      element.dataset.landingRevealDirection = "down";
      element.dataset.landingRevealVariant = element.matches(CARD_SELECTORS)
        ? "card"
        : "soft";
      element.style.setProperty("--landing-reveal-order", "0");
      element.style.setProperty("--landing-reveal-order-up", "0");
    });

    STAGGER_GROUPS.forEach((selector) => {
      const group = Array.from(root.querySelectorAll<HTMLElement>(selector));

      group.forEach((element, index) => {
        element.style.setProperty(
          "--landing-reveal-order",
          String(Math.min(index, MAX_STAGGER_ORDER)),
        );
        element.style.setProperty(
          "--landing-reveal-order-up",
          String(Math.min(group.length - index - 1, MAX_STAGGER_ORDER)),
        );
      });
    });

    root.classList.add("landing-reveal-ready");
    root.dataset.landingScrollDirection = "down";

    let revealObserver: IntersectionObserver | null = null;
    let resetObserver: IntersectionObserver | null = null;
    let frame = 0;
    let lastScrollY = window.scrollY;
    let scrollDirection: ScrollDirection = "down";

    const reveal = (element: HTMLElement, direction: ScrollDirection) => {
      element.dataset.landingRevealDirection = direction;
      element.classList.add("is-revealed");
    };

    const conceal = (element: HTMLElement) => {
      element.classList.remove("is-revealed");
    };

    const revealEverything = () => {
      revealItems.forEach((element) => reveal(element, "down"));
    };

    const motionDisabled = () =>
      reducedMotionQuery.matches || getDocumentAnimationMode() === "none";

    const setupObservers = () => {
      revealObserver?.disconnect();
      resetObserver?.disconnect();

      if (motionDisabled() || !("IntersectionObserver" in window)) {
        revealEverything();
        return;
      }

      const resetBuffer = window.innerHeight * 0.22;
      revealItems.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        const isFarOutsideViewport =
          bounds.bottom < -resetBuffer ||
          bounds.top > window.innerHeight + resetBuffer;

        if (isFarOutsideViewport) conceal(element);
      });

      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            reveal(entry.target as HTMLElement, scrollDirection);
          });
        },
        {
          threshold: 0.06,
          rootMargin: "-3% 0px -7% 0px",
        },
      );

      resetObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) return;
            conceal(entry.target as HTMLElement);
          });
        },
        {
          threshold: 0,
          rootMargin: "22% 0px 22% 0px",
        },
      );

      revealItems.forEach((element) => {
        revealObserver?.observe(element);
        resetObserver?.observe(element);
      });
    };

    const updateScrollState = () => {
      frame = 0;
      const nextScrollY = window.scrollY;

      if (motionDisabled()) {
        scrollDirection = "down";
        lastScrollY = nextScrollY;
        root.dataset.landingScrollDirection = "down";
        root.style.setProperty("--landing-scroll-progress", "0");
        return;
      }

      const delta = nextScrollY - lastScrollY;

      if (Math.abs(delta) > 2) {
        scrollDirection = delta > 0 ? "down" : "up";
        root.dataset.landingScrollDirection = scrollDirection;
        lastScrollY = nextScrollY;
      }

      const scrollable = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const progress = Math.min(Math.max(nextScrollY / scrollable, 0), 1);
      root.style.setProperty("--landing-scroll-progress", String(progress));
    };

    const onScroll = () => {
      if (motionDisabled() || frame) return;
      frame = window.requestAnimationFrame(updateScrollState);
    };

    const onResize = () => {
      updateScrollState();
      setupObservers();
    };

    const onMotionPreferenceChange = () => {
      updateScrollState();
      setupObservers();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== ANIMATION_STORAGE_KEY) return;
      onMotionPreferenceChange();
    };

    updateScrollState();
    setupObservers();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener(ANIMATION_MODE_CHANGE_EVENT, onMotionPreferenceChange);
    window.addEventListener("storage", onStorage);
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);

    return () => {
      revealObserver?.disconnect();
      resetObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(
        ANIMATION_MODE_CHANGE_EVENT,
        onMotionPreferenceChange,
      );
      window.removeEventListener("storage", onStorage);
      reducedMotionQuery.removeEventListener("change", onMotionPreferenceChange);
      if (frame) window.cancelAnimationFrame(frame);

      revealItems.forEach((element) => {
        element.classList.remove("is-revealed");
        delete element.dataset.landingReveal;
        delete element.dataset.landingRevealDirection;
        delete element.dataset.landingRevealVariant;
        element.style.removeProperty("--landing-reveal-order");
        element.style.removeProperty("--landing-reveal-order-up");
      });
      root.classList.remove("landing-reveal-ready");
      delete root.dataset.landingScrollDirection;
    };
  }, []);

  return null;
}
