"use client";

import { useEffect } from "react";

const TOOLTIP_VISIBLE_MS = 2_000;
const DISMISSED_ATTRIBUTE = "data-chart-tooltip-dismissed";

function getChartElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(".recharts-wrapper");
}

function getTooltipElement(chart: HTMLElement) {
  return chart.querySelector<HTMLElement>(".recharts-tooltip-wrapper");
}

function revealTooltip(chart: HTMLElement) {
  getTooltipElement(chart)?.removeAttribute(DISMISSED_ATTRIBUTE);
}

export default function ChartTooltipAutoDismiss() {
  useEffect(() => {
    const timers = new Map<HTMLElement, number>();

    function clearTimer(chart: HTMLElement) {
      const timer = timers.get(chart);
      if (timer === undefined) return;

      window.clearTimeout(timer);
      timers.delete(chart);
    }

    function handlePointerDown(event: PointerEvent) {
      const chart = getChartElement(event.target);
      if (!chart) return;

      clearTimer(chart);
    }

    function handleChartClick(event: MouseEvent) {
      const chart = getChartElement(event.target);
      if (!chart) return;

      clearTimer(chart);
      revealTooltip(chart);

      // Recharts may finish its click update after the native event bubbles.
      // Revealing again on the next frame keeps repeated clicks flicker-free.
      window.requestAnimationFrame(() => revealTooltip(chart));

      const timer = window.setTimeout(() => {
        getTooltipElement(chart)?.setAttribute(DISMISSED_ATTRIBUTE, "true");
        timers.delete(chart);
      }, TOOLTIP_VISIBLE_MS);

      timers.set(chart, timer);
    }

    function handleMousePointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse" || event.buttons !== 0) return;

      const chart = getChartElement(event.target);
      if (!chart) return;

      // Preserve the existing desktop hover interaction after a timed click ends.
      revealTooltip(chart);
    }

    function handleFocusIn(event: FocusEvent) {
      const chart = getChartElement(event.target);
      if (!chart) return;

      // Keyboard tooltip behavior remains unchanged.
      revealTooltip(chart);
    }

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("click", handleChartClick);
    document.addEventListener("pointermove", handleMousePointerMove, {
      passive: true,
    });
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("click", handleChartClick);
      document.removeEventListener("pointermove", handleMousePointerMove);
      document.removeEventListener("focusin", handleFocusIn);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <style>{`
      .recharts-tooltip-wrapper[${DISMISSED_ATTRIBUTE}="true"] {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transition: opacity 160ms ease, visibility 0s linear 160ms !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .recharts-tooltip-wrapper[${DISMISSED_ATTRIBUTE}="true"] {
          transition: none !important;
        }
      }
    `}</style>
  );
}
