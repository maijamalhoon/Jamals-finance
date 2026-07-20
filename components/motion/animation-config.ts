import type { Variants } from "framer-motion";
import {
  getAnimationDurationScale,
  scaleAnimationMilliseconds,
  scaleAnimationSeconds,
} from "@/lib/animation-preference";

export const motionEase = [0.16, 1, 0.3, 1] as const;

const animationScale = getAnimationDurationScale();
const seconds = (value: number) => scaleAnimationSeconds(value);
const milliseconds = (value: number) => scaleAnimationMilliseconds(value);

export const motionDurations = {
  instant: seconds(0.09),
  fast: seconds(0.16),
  base: seconds(0.22),
  page: seconds(0.28),
  slow: seconds(0.32),
  deliberate: seconds(0.42),
  skeleton: seconds(1.4),
  chart: milliseconds(850),
} as const;

export const viewportReveal = {
  amount: 0.18,
  margin: "0px 0px -8% 0px",
  once: true,
} as const;

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.page,
      ease: motionEase,
      staggerChildren: seconds(0.035),
      delayChildren: seconds(0.02),
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const panelVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: motionDurations.base,
      ease: motionEase,
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.985,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const drawerVariants: Variants = {
  initial: {
    x: "-4%",
    opacity: 0.98,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: motionDurations.base,
      ease: motionEase,
    },
  },
  exit: {
    x: "-4%",
    opacity: 0,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const listContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: seconds(0.035),
      delayChildren: seconds(0.03),
    },
  },
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const pressableMotion = {
  whileHover: {
    y: -1,
    scale: 1.015,
  },
  whileTap: {
    scale: 0.985,
  },
  transition: {
    duration: motionDurations.fast,
    ease: motionEase,
  },
} as const;

type ChartMotionSpreadProps = {
  animationBegin: number;
  animationDuration: number;
  animationEasing: "ease-out";
};

export const chartMotion = {
  animationBegin: 0,
  animationDuration: motionDurations.chart,
  animationEasing: "ease-out" as const,
  isAnimationActive: animationScale > 0,
} as ChartMotionSpreadProps;
