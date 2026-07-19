"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const RECEIPT_ROUTE = /^\/dashboard\/transactions\/[^/]+\/?$/;
const FIT_SCALE_PROPERTY = "--receipt-fit-scale";

export default function TransactionReceiptViewportFit() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (!pathname || !RECEIPT_ROUTE.test(pathname)) return;

    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let receiptPage: HTMLElement | null = null;
    let dashboardScroller: HTMLElement | null = null;
    let disposed = false;

    const scheduleFit = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (disposed) return;

        const receipt = document.querySelector<HTMLElement>(
          "[data-transaction-receipt]",
        );
        receiptPage = receipt?.closest<HTMLElement>("main") ?? null;
        dashboardScroller =
          receipt?.closest<HTMLElement>("[data-dashboard-scroll]") ?? null;

        if (!receiptPage || !dashboardScroller) return;

        receiptPage.style.setProperty(FIT_SCALE_PROPERTY, "1");
        dashboardScroller.scrollTop = 0;

        const pageRect = receiptPage.getBoundingClientRect();
        const scrollerRect = dashboardScroller.getBoundingClientRect();
        const availableHeight = Math.max(
          1,
          scrollerRect.bottom - pageRect.top - 8,
        );
        const availableWidth = Math.max(
          1,
          dashboardScroller.clientWidth - 16,
        );
        const naturalHeight = Math.max(
          receiptPage.scrollHeight,
          receiptPage.offsetHeight,
        );
        const naturalWidth = Math.max(
          receiptPage.scrollWidth,
          receiptPage.offsetWidth,
        );

        let nextScale = Math.min(
          1,
          availableHeight / naturalHeight,
          availableWidth / naturalWidth,
        );

        if (!Number.isFinite(nextScale) || nextScale <= 0) nextScale = 1;

        // Leave a tiny safety margin for browser UI and fractional pixel rounding.
        nextScale = Math.max(0.01, nextScale - 0.006);
        receiptPage.style.setProperty(
          FIT_SCALE_PROPERTY,
          nextScale.toFixed(4),
        );
      });
    };

    const connect = () => {
      const receipt = document.querySelector<HTMLElement>(
        "[data-transaction-receipt]",
      );

      if (!receipt) {
        animationFrame = window.requestAnimationFrame(connect);
        return;
      }

      receiptPage = receipt.closest<HTMLElement>("main");
      dashboardScroller = receipt.closest<HTMLElement>(
        "[data-dashboard-scroll]",
      );

      if (!receiptPage || !dashboardScroller) return;

      resizeObserver = new ResizeObserver(scheduleFit);
      resizeObserver.observe(receiptPage);
      resizeObserver.observe(dashboardScroller);

      window.addEventListener("resize", scheduleFit, { passive: true });
      window.visualViewport?.addEventListener("resize", scheduleFit, {
        passive: true,
      });

      void document.fonts?.ready.then(scheduleFit);
      scheduleFit();
    };

    connect();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleFit);
      window.visualViewport?.removeEventListener("resize", scheduleFit);
      receiptPage?.style.removeProperty(FIT_SCALE_PROPERTY);
    };
  }, [pathname]);

  return null;
}
