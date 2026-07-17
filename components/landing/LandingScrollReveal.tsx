"use client";

import { useEffect } from "react";

const REVEAL_SELECTORS = [
  'section[aria-label="Product values"] > div > div',
  "#capabilities > div:first-child",
  "#capabilities article",
  "#workflow > div > div:first-child",
  "#workflow li",
  "#preview > div:first-child",
  "#preview > figure",
  "#privacy > div > div:first-child",
  "#privacy .finance-surface",
  ".jf-node4-cta",
  "footer > div > *",
] as const;

export default function LandingScrollReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".jf-node4-landing");
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealItems: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    REVEAL_SELECTORS.forEach((selector) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        if (seen.has(element)) return;
        seen.add(element);
        element.dataset.landingReveal = "";
        element.style.setProperty(
          "--landing-reveal-order",
          String(Math.min(index, 6)),
        );
        revealItems.push(element);
      });
    });

    root.classList.add("landing-reveal-ready");

    const reveal = (element: HTMLElement) => {
      element.classList.add("is-revealed");
    };

    let observer: IntersectionObserver | null = null;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(reveal);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const element = entry.target as HTMLElement;
            reveal(element);
            observer?.unobserve(element);
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -8% 0px",
        },
      );

      revealItems.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.92) {
          reveal(element);
        } else {
          observer?.observe(element);
        }
      });
    }

    let frame = 0;
    const updateScrollProgress = () => {
      frame = 0;
      const scrollable = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
      root.style.setProperty("--landing-scroll-progress", String(progress));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
