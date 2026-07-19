"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";

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

const MIN_RENDER_WIDTH = 32;
const MIN_RENDER_HEIGHT = 32;

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

export default function ChartFrame({
  children,
  className = "",
  style,
  tone = "default",
}: ChartFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const [size, setSize] = useState<ChartSize>({
    width: 0,
    height: 0,
  });

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

  let content: ReactNode = null;

  if (isReady) {
    content = typeof children === "function" ? children(size) : children;
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
