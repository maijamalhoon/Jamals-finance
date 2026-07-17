"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import type { ReactNode } from "react";

import { useHasMounted } from "@/components/motion/useHasMounted";

const smoothEase = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: smoothEase,
    },
  },
};

const dashboardOverviewStyles = `
  @media (min-width: 1024px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .dashboard-overview-layout > *,
    .dashboard-overview-layout > div.grid:nth-last-child(-n + 2) > * {
      min-width: 0;
      grid-column: 1 / -1;
      margin-top: 0 !important;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n + 2) {
      display: contents;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 10;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 11;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 12;
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 13;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > :nth-last-child(3) {
      order: 20;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 21;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      order: 22;
      grid-column: 2;
    }
  }

  @media (min-width: 1536px) {
    .dashboard-overview-layout {
      grid-template-columns:
        minmax(0, 2fr)
        minmax(260px, 0.95fr)
        minmax(280px, 1fr);
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      grid-column: 3;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      grid-column: 2 / 4;
    }
  }
`;

export function DashboardMotion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const mounted = useHasMounted();
  const overviewLayout = className.split(/\s+/).includes("dashboard-overview");
  const resolvedClassName = overviewLayout
    ? `${className} dashboard-overview-layout`
    : className;

  return (
    <>
      {overviewLayout ? <style>{dashboardOverviewStyles}</style> : null}
      <motion.div
        variants={container}
        initial={!mounted || reduceMotion ? false : "hidden"}
        animate="show"
        className={resolvedClassName}
      >
        {children}
      </motion.div>
    </>
  );
}

export function DashboardMotionItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const mounted = useHasMounted();

  return (
    <motion.div
      variants={item}
      initial={!mounted || reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
