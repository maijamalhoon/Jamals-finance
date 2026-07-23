"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Pie } from "recharts";

type ChartSize = {
  width: number;
  height: number;
};

type ChartFrameChildren = ReactNode | ((size: ChartSize) => ReactNode);

type ChartFrameProps = {
  children: ChartFrameChildren;
  className?: string;
  style?: CSSProperties;
  tone?: string;
};

type ChartElementProps = {
  children?: ReactNode;
  isAnimationActive?: boolean;
  onAnimationEnd?: () => void;
};

const MIN_RENDER_WIDTH = 32;
const MIN_RENDER_HEIGHT = 32;
const LIVE_PORTFOLIO_FRAME_TOKEN = "!overflow-visible";
const PIE_ANIMATION_SAFETY_MS = 850;

function getElementSize(element: HTMLDivElement | null): ChartSize {
  if (!element) {
    return {
      width: 0,
      height: 0,
    };
  }

  const rect = element.getBoundingClientRect();

  return {
    width: Math.max(0, Math.floor(rect.width)),
    height: Math.max(0, Math.floor(rect.height)),
  };
}

function isRenderableSize(size: ChartSize) {
  return size.width >= MIN_RENDER_WIDTH && size.height >= MIN_RENDER_HEIGHT;
}

function stabilizePieAnimation(
  node: ReactNode,
  animationActive: boolean,
  completeAnimation: () => void,
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement<ChartElementProps>(child)) return child;

    const nestedChildren =
      child.props.children === undefined ?
        child.props.children
      : stabilizePieAnimation(
          child.props.children,
          animationActive,
          completeAnimation,
        );

    if (child.type === Pie) {
      const originalAnimationEnd = child.props.onAnimationEnd;

      return cloneElement(child, {
        children: nestedChildren,
        isAnimationActive:
          child.props.isAnimationActive !== false && animationActive,
        onAnimationEnd: () => {
          originalAnimationEnd?.();
          completeAnimation();
        },
      });
    }

    if (nestedChildren !== child.props.children) {
      return cloneElement(child, { children: nestedChildren });
    }

    return child;
  });
}

export default function ChartFrame({
  children,
  className = "",
  style,
  tone = "default",
}: ChartFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const shouldStabilizeLivePortfolioPie = className.includes(
    LIVE_PORTFOLIO_FRAME_TOKEN,
  );
  const [pieAnimationComplete, setPieAnimationComplete] = useState(false);

  const [size, setSize] = useState<ChartSize>({
    width: 0,
    height: 0,
  });

  const completePieAnimation = useCallback(() => {
    setPieAnimationComplete(true);
  }, []);

  useLayoutEffect(() => {
    const element = frameRef.current;

    if (!element) return;

    const updateSize = () => {
      const nextSize = getElementSize(element);

      setSize((currentSize) => {
        if (
          currentSize.width === nextSize.width &&
          currentSize.height === nextSize.height
        ) {
          return currentSize;
        }

        return nextSize;
      });
    };

    const scheduleUpdate = () => {
      if (resizeFrameRef.current !== null) return;

      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        updateSize();
      });
    };

    // Measure synchronously before the first paint so charts mount at their
    // final dimensions instead of waiting through multiple animation frames.
    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    let usesWindowFallback = false;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(element);
    } else {
      usesWindowFallback = true;
      window.addEventListener("resize", scheduleUpdate, { passive: true });
    }

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }

      resizeObserver?.disconnect();

      if (usesWindowFallback) {
        window.removeEventListener("resize", scheduleUpdate);
      }
    };
  }, []);

  const isReady = isRenderableSize(size);

  useEffect(() => {
    if (
      !shouldStabilizeLivePortfolioPie ||
      !isReady ||
      pieAnimationComplete
    ) {
      return;
    }

    // A live price can arrive before Recharts reports animation completion.
    // This fixed window prevents those updates from restarting the entrance
    // animation indefinitely while preserving the authored first animation.
    const timer = window.setTimeout(
      completePieAnimation,
      PIE_ANIMATION_SAFETY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [
    completePieAnimation,
    isReady,
    pieAnimationComplete,
    shouldStabilizeLivePortfolioPie,
  ]);

  let content: ReactNode = null;

  if (isReady) {
    content = typeof children === "function" ? children(size) : children;

    if (shouldStabilizeLivePortfolioPie) {
      content = stabilizePieAnimation(
        content,
        !pieAnimationComplete,
        completePieAnimation,
      );
    }
  }

  return (
    <div
      ref={frameRef}
      className={`relative h-full w-full min-w-0 overflow-hidden ${className}`}
      data-chart-tone={tone}
      style={style}
    >
      {isReady ? (
        <div className="h-full min-h-0 w-full min-w-0 overflow-hidden">
          {content}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="finance-skeleton h-full min-h-[160px] w-full rounded-[var(--oneui-card-radius)]"
        />
      )}
    </div>
  );
}
