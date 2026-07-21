import type { Variants } from "framer-motion";
import {
  getAnimationDurationScale,
  getDocumentAnimationMode,
  scaleAnimationMilliseconds,
  scaleAnimationSeconds,
} from "@/lib/animation-preference";

export const motionEase = [0.16, 1, 0.3, 1] as const;

const animationMode = getDocumentAnimationMode();
const animationScale = getAnimationDurationScale(animationMode);
const seconds = (value: number) =>
  scaleAnimationSeconds(value, animationMode);
const milliseconds = (value: number) =>
  scaleAnimationMilliseconds(value, animationMode);

// Standard keeps every authored animation, but resolves entrances, chart travel
// and stagger queues inside a smaller frame budget. Fast and none keep their
// existing authored scaling exactly.
const standardSeconds = (optimized: number, authored: number) =>
  animationMode === "standard" ? optimized : seconds(authored);
const standardMilliseconds = (optimized: number, authored: number) =>
  animationMode === "standard" ? optimized : milliseconds(authored);

export const motionDurations = {
  instant: standardSeconds(0.07, 0.09),
  fast: standardSeconds(0.12, 0.16),
  base: standardSeconds(0.18, 0.22),
  page: standardSeconds(0.21, 0.28),
  slow: standardSeconds(0.25, 0.32),
  deliberate: standardSeconds(0.31, 0.42),
  skeleton: standardSeconds(0.84, 1.4),
  chart: standardMilliseconds(540, 850),
} as const;

export const viewportReveal = {
  amount: 0.18,
  margin: "0px 0px -8% 0px",
  once: true,
} as const;

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionDurations.page,
      ease: motionEase,
      staggerChildren: standardSeconds(0.012, 0.035),
      delayChildren: standardSeconds(0.006, 0.02),
    },
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: {
      duration: motionDurations.fast,
      ease: motionEase,
    },
  },
};

export const panelVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
    scale: 0.99,
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
    y: 4,
    scale: 0.99,
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
    x: "-3%",
    opacity: 0.985,
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
    x: "-3%",
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
      staggerChildren: standardSeconds(0.012, 0.035),
      delayChildren: standardSeconds(0.008, 0.03),
    },
  },
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 5,
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
    y: 3,
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

function createChartMotion(): ChartMotionSpreadProps {
  const motion: ChartMotionSpreadProps = {
    animationBegin: 0,
    animationDuration: motionDurations.chart,
    animationEasing: "ease-out",
  };

  Object.defineProperty(motion, "isAnimationActive", {
    value: animationScale > 0,
    enumerable: true,
    configurable: false,
    writable: false,
  });

  return motion;
}

export const chartMotion = createChartMotion();
