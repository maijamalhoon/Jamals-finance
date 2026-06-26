"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  const animationFrameRef = useRef<number | null>(null);
  const secondAnimationFrameRef = useRef<number | null>(null);

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

      if (secondAnimationFrameRef.current) {
        cancelAnimationFrame(secondAnimationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        secondAnimationFrameRef.current = requestAnimationFrame(updateSize);
      });
    };

    scheduleUpdate();

    window.addEventListener("resize", scheduleUpdate);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        if (secondAnimationFrameRef.current) {
          cancelAnimationFrame(secondAnimationFrameRef.current);
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

      if (secondAnimationFrameRef.current) {
        cancelAnimationFrame(secondAnimationFrameRef.current);
      }

      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const isReady = isRenderableSize(size);

  const content =
    isReady && typeof children === "function" ? children(size) : children;

  return (
    <div
      ref={frameRef}
      className={`relative w-full min-w-0 overflow-hidden ${className}`}
      data-chart-tone={tone}
      style={style}
    >
      {isReady ?
        <div className="h-full min-h-0 w-full min-w-0">{content}</div>
      : <div
          aria-hidden="true"
          className="jf-skeleton h-full min-h-[180px] w-full"
        />
      }
    </div>
  );
}
