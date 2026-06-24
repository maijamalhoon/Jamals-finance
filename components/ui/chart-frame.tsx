"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ChartSize = {
  width: number;
  height: number;
};

type ChartFrameChildren = ReactNode | ((size: ChartSize) => ReactNode);

export default function ChartFrame({
  className,
  tone = "orange",
  children,
}: {
  className: string;
  tone?: "orange" | "green" | "blue";
  children: ChartFrameChildren;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let raf = 0;
    const measure = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect();
        const nextSize = {
          width: Math.max(1, Math.floor(rect.width)),
          height: Math.max(1, Math.floor(rect.height)),
        };
        const canRender = nextSize.width > 1 && nextSize.height > 1;

        if (!canRender) {
          setSize(null);
          setReady(false);
          return;
        }

        setSize((current) =>
          current?.width === nextSize.width && current?.height === nextSize.height ?
            current
          : nextSize,
        );
        setReady(true);
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={frameRef} className={className} style={{ minHeight: 1, minWidth: 1 }}>
      {ready && size ?
        <div className="finance-graph-ready h-full min-h-px w-full min-w-px">
          {typeof children === "function" ? children(size) : children}
        </div>
      : <div className={`finance-graph-loader finance-graph-loader-${tone}`} />}
    </div>
  );
}
