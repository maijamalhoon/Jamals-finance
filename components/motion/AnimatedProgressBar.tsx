"use client";

import { useEffect, useMemo, useState } from "react";

export default function AnimatedProgressBar({
  value,
  accent,
  delay = 0,
  heightClass = "h-1.5",
}: {
  value: number;
  accent: string;
  delay?: number;
  heightClass?: string;
}) {
  const [ready, setReady] = useState(false);

  const safeValue = useMemo(() => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(value, 100));
  }, [value]);

  useEffect(() => {
    setReady(false);

    const frame = window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        setReady(true);
      }, delay * 1000);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [safeValue, delay]);

  return (
    <div
      className={`${heightClass} overflow-hidden rounded-full`}
      style={{
        backgroundColor: `color-mix(in srgb, ${accent}, var(--card) 88%)`,
      }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: ready ? `${safeValue}%` : "0%",
          minWidth: ready && safeValue > 0 ? "8px" : "0px",
          backgroundColor: accent,
          transition:
            "width 1100ms cubic-bezier(0.16, 1, 0.3, 1), min-width 1100ms cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "width",
        }}
      />
    </div>
  );
}
