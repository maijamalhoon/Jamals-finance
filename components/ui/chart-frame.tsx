"use client";

import { useEffect, useRef, useState } from "react";

export default function ChartFrame({
  className,
  tone = "orange",
  children,
}: {
  className: string;
  tone?: "orange" | "green" | "blue";
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let raf = 0;
    let revealTimeout: number | undefined;

    const measure = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect();
        const canRender = rect.width > 0 && rect.height > 0;

        if (!canRender) {
          setReady(false);
          return;
        }

        revealTimeout ??= window.setTimeout(() => {
          setReady(true);
        }, 420);
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      if (revealTimeout) window.clearTimeout(revealTimeout);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={frameRef} className={className}>
      {ready ?
        <div className="finance-graph-ready h-full w-full">{children}</div>
      : <div className={`finance-graph-loader finance-graph-loader-${tone}`} />}
    </div>
  );
}
