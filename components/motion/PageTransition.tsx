"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { pageVariants } from "@/components/motion/animation-config";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const targets = Array.from(
      page.querySelectorAll<HTMLElement>(
        [
          ".page-heading",
          ".finance-panel",
          ".finance-panel-soft",
          ".finance-reference-card",
          ".dashboard-graph-card",
          ".dashboard-chart-empty",
          ".summary-card",
          ".card-hover",
          "[data-slot='card']",
          "[data-motion-reveal]",
        ].join(", "),
      ),
    );

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    targets.forEach((target, index) => {
      target.classList.add("motion-observe");
      target.style.setProperty(
        "--motion-reveal-delay",
        `${Math.min(index * 35, 210)}ms`,
      );
      observer.observe(target);
    });

    return () => {
      observer.disconnect();
      targets.forEach((target) => {
        target.classList.remove("motion-observe", "is-visible");
        target.style.removeProperty("--motion-reveal-delay");
      });
    };
  }, [pathname, reduceMotion]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={pageRef}
        key={pathname}
        className="page-transition"
        variants={pageVariants}
        initial={reduceMotion ? false : "initial"}
        animate="animate"
        exit={reduceMotion ? undefined : "exit"}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
