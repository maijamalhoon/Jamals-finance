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

export function DashboardMotion({
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
      variants={container}
      initial={!mounted || reduceMotion ? false : "hidden"}
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
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
