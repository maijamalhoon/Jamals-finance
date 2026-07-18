"use client";

import { useEffect } from "react";

const CENTER_VARIABLE = "--jf-visual-viewport-center-y";
const HEIGHT_VARIABLE = "--jf-visual-viewport-height";

export default function VisualViewportMetrics() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;

      root.style.setProperty(CENTER_VARIABLE, `${offsetTop + height / 2}px`);
      root.style.setProperty(HEIGHT_VARIABLE, `${height}px`);
    };

    update();
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    viewport?.addEventListener("resize", update, { passive: true });
    viewport?.addEventListener("scroll", update, { passive: true });

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      root.style.removeProperty(CENTER_VARIABLE);
      root.style.removeProperty(HEIGHT_VARIABLE);
    };
  }, []);

  return null;
}
