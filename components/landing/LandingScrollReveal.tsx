"use client";

import { useEffect } from "react";

const REVEAL_SELECTORS = [
  ".jf-reveal",
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
  ".jf-insight-points > span",
  ".jf-insight-header",
  ".jf-insight-content",
  ".jf-insight-bars > div",
  ".jf-mini-bars",
  ".jf-footer-nav > div",
].join(",");

const STAGGER_GROUPS = [
  ".jf-hero-copy > *",
  ".jf-preview-metrics > div",
  ".jf-value-item",
  ".jf-feature",
  ".jf-insight-points > span",
  ".jf-insight-bars > div",
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
    });

    STAGGER_GROUPS.forEach((selector) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        element.style.setProperty(
          "--landing-reveal-order",
          String(Math.min(index, 7)),
        );
      });
    });

    root.classList.add("landing-reveal-ready");

    let observer: IntersectionObserver | null = null;
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

    const setupObserver = () => {
      observer?.disconnect();

      if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
        revealEverything();
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const element = entry.target as HTMLElement;

            if (entry.isIntersecting) {
              reveal(element, scrollDirection);
              return;
            }

            // Reset only after the component has fully left the buffered viewport.
            // It can then replay naturally when reached again from either direction.
            conceal(element);
          });
        },
        {
          threshold: 0.01,
          rootMargin: "5% 0px 5% 0px",
        },
      );

      revealItems.forEach((element) => observer?.observe(element));
    };

    const updateScrollState = () => {
      frame = 0;
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;

      if (Math.abs(delta) > 3) {
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
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollState);
    };

    const onReducedMotionChange = () => {
      setupObserver();
    };

    updateScrollState();
    setupObserver();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      if (frame) window.cancelAnimationFrame(frame);

      revealItems.forEach((element) => {
        element.classList.remove("is-revealed");
        delete element.dataset.landingReveal;
        delete element.dataset.landingRevealDirection;
        delete element.dataset.landingRevealVariant;
        element.style.removeProperty("--landing-reveal-order");
      });
      root.classList.remove("landing-reveal-ready");
      delete root.dataset.landingScrollDirection;
    };
  }, []);

  return null;
}
