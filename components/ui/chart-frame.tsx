"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type ChartSize = {
  width: number;
  height: number;
};

type ChartFrameProps = {
  children: (size: ChartSize) => ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: string;
};

const MIN_RENDER_WIDTH = 16;
const MIN_RENDER_HEIGHT = 16;

function getElementSize(element: HTMLDivElement | null) {
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

export default function ChartFrame({
  children,
  className = "",
  style,
  tone = "default",
}: ChartFrameProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [size, setSize] = useState<ChartSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(updateSize);
    };

    scheduleUpdate();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", scheduleUpdate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        window.removeEventListener("resize", scheduleUpdate);
      };
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate);

    resizeObserver.observe(element);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      resizeObserver.disconnect();
    };
  }, []);

  const isReady =
    size.width >= MIN_RENDER_WIDTH && size.height >= MIN_RENDER_HEIGHT;

  return (
    <div
      ref={frameRef}
      className={`relative w-full min-w-0 ${className}`}
      data-chart-tone={tone}
      style={style}
    >
      {isReady ?
        children(size)
      : <div aria-hidden="true" className="h-full w-full" />}
    </div>
  );
}
