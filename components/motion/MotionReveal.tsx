"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import {
  motionDurations,
  motionEase,
  viewportReveal,
} from "@/components/motion/animation-config";

type MotionRevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  delay?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export default function MotionReveal<T extends ElementType = "div">({
  as,
  children,
  delay = 0,
  ...props
}: MotionRevealProps<T>) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion(as ?? "div") as ElementType;

  return (
    <MotionTag
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: 12, scale: 0.992 }
      }
      whileInView={
        reduceMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1 }
      }
      viewport={viewportReveal}
      transition={{ duration: motionDurations.deliberate, ease: motionEase, delay }}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
