"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { motionDurations, motionEase } from "@/components/motion/animation-config";

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: motionDurations.base, ease: motionEase }}
    >
      {children}
    </MotionConfig>
  );
}
