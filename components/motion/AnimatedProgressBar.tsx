"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDocumentAnimationMode,
  scaleAnimationMilliseconds,
} from "@/lib/animation-preference";

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
    const animationMode = getDocumentAnimationMode();

    if (animationMode === "none") {
      setReady(true);
      return;
    }

    setReady(false);
    let timeoutId = 0;
    const frame = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(
        () => setReady(true),
        scaleAnimationMilliseconds(delay * 1000, animationMode),
      );
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
    };
  }, [safeValue, delay]);

  const animationMode = getDocumentAnimationMode();
  const transitionDuration = scaleAnimationMilliseconds(1100, animationMode);

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
            transitionDuration === 0
              ? "none"
              : `width ${transitionDuration}ms cubic-bezier(0.16, 1, 0.3, 1), min-width ${transitionDuration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          willChange: animationMode === "none" ? "auto" : "width",
        }}
      />
    </div>
  );
}
