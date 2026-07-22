"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

import HeaderSearchAutoClose from "@/components/layout/HeaderSearchAutoClose";

const DesktopHeader = dynamic(() => import("@/components/layout/Header"), {
  ssr: false,
});

const CompactHeader = dynamic(
  () => import("@/components/layout/MobileHeader"),
  { ssr: false },
);

const DESKTOP_HEADER_SEARCH_TRIGGER_SELECTOR = "[data-header-search-trigger]";
const GLOBAL_SEARCH_INPUT_SELECTOR = [
  'input[type="search"]',
  'input[role="searchbox"]',
  'input[placeholder*="search" i]',
  'input[aria-label*="search" i]',
].join(",");

type HeaderMode = "desktop" | "compact" | null;

type ResponsiveDashboardHeaderProps = {
  notificationSlot: ReactNode;
};

function HeaderSearchOpenFallback() {
  useEffect(() => {
    const isSearchOpen = (trigger: HTMLButtonElement) => {
      const input = trigger
        .closest("form")
        ?.querySelector<HTMLInputElement>(
          "#desktop-inline-transaction-search",
        );

      return input?.getAttribute("aria-hidden") === "false";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const trigger = event.target.closest<HTMLButtonElement>(
        DESKTOP_HEADER_SEARCH_TRIGGER_SELECTOR,
      );

      if (!trigger || isSearchOpen(trigger)) return;

      // Desktop keeps the trusted pointer fallback because its search surface
      // does not move underneath the active pointer.
      event.preventDefault();
      trigger.click();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return null;
}

function GlobalFloatingSearchPlaceholders() {
  useEffect(() => {
    const enhancedInputs = new Set<HTMLInputElement>();
    let geometryFrame = 0;

    const getPlaceholder = (input: HTMLInputElement) => {
      const currentPlaceholder = input.getAttribute("placeholder")?.trim();
      if (currentPlaceholder) return currentPlaceholder;

      const accessibleLabel = input.getAttribute("aria-label")?.trim();
      if (accessibleLabel?.toLowerCase().includes("search")) {
        return `${accessibleLabel.replace(/[.…]+$/, "")}...`;
      }

      return "Search...";
    };

    const syncInputGeometry = (input: HTMLInputElement) => {
      if (!input.isConnected) {
        enhancedInputs.delete(input);
        return;
      }

      const host = input.parentElement;
      if (!host) return;

      const hostRect = host.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const inputStyle = window.getComputedStyle(input);
      const paddingLeft = Number.parseFloat(inputStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(inputStyle.paddingRight) || 0;
      const relativeInputTop = inputRect.top - hostRect.top;
      const labelLeft = inputRect.left - hostRect.left + paddingLeft;
      const labelWidth = Math.max(
        0,
        inputRect.width - paddingLeft - paddingRight,
      );
      const idleTop = relativeInputTop + inputRect.height / 2;
      const activeTop = Math.max(3, relativeInputTop - 7);

      host.style.setProperty("--jf-search-label-left", `${labelLeft}px`);
      host.style.setProperty("--jf-search-label-width", `${labelWidth}px`);
      host.style.setProperty("--jf-search-label-idle-top", `${idleTop}px`);
      host.style.setProperty("--jf-search-label-active-top", `${activeTop}px`);
    };

    const syncAllGeometry = () => {
      window.cancelAnimationFrame(geometryFrame);
      geometryFrame = window.requestAnimationFrame(() => {
        enhancedInputs.forEach(syncInputGeometry);
      });
    };

    const enhanceInput = (input: HTMLInputElement) => {
      if (!input.matches(GLOBAL_SEARCH_INPUT_SELECTOR)) return;

      const host = input.parentElement;
      if (!host) return;

      const placeholder = getPlaceholder(input);
      if (!input.getAttribute("placeholder")?.trim()) {
        input.setAttribute("placeholder", placeholder);
      }

      input.dataset.jfFloatingSearch = "true";
      host.dataset.jfSearchHost = "true";
      host.dataset.jfSearchPlaceholder = placeholder;
      enhancedInputs.add(input);
      resizeObserver?.observe(input);
      resizeObserver?.observe(host);
      syncAllGeometry();
    };

    const scanForSearchInputs = (root: ParentNode) => {
      if (
        root instanceof HTMLInputElement &&
        root.matches(GLOBAL_SEARCH_INPUT_SELECTOR)
      ) {
        enhanceInput(root);
      }

      root
        .querySelectorAll<HTMLInputElement>(GLOBAL_SEARCH_INPUT_SELECTOR)
        .forEach(enhanceInput);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncAllGeometry);

    scanForSearchInputs(document);

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          if (mutation.target instanceof HTMLInputElement) {
            enhanceInput(mutation.target);
          }
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scanForSearchInputs(node);
        });
      }
    });

    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "type",
        "role",
        "placeholder",
        "aria-label",
        "aria-hidden",
        "class",
        "style",
      ],
    });

    window.addEventListener("resize", syncAllGeometry, { passive: true });
    window.addEventListener("orientationchange", syncAllGeometry, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(geometryFrame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncAllGeometry);
      window.removeEventListener("orientationchange", syncAllGeometry);

      enhancedInputs.forEach((input) => {
        const host = input.parentElement;
        delete input.dataset.jfFloatingSearch;
        if (!host) return;

        delete host.dataset.jfSearchHost;
        delete host.dataset.jfSearchPlaceholder;
        host.style.removeProperty("--jf-search-label-left");
        host.style.removeProperty("--jf-search-label-width");
        host.style.removeProperty("--jf-search-label-idle-top");
        host.style.removeProperty("--jf-search-label-active-top");
      });
    };
  }, []);

  return (
    <style jsx global>{`
      :where([data-jf-search-host="true"]):not(.fixed):not(.absolute):not(
          .sticky
        ):not(.relative) {
        position: relative;
      }

      [data-jf-search-host="true"]::after {
        content: attr(data-jf-search-placeholder);
        position: absolute;
        z-index: 2;
        top: var(--jf-search-label-idle-top, 50%);
        left: var(--jf-search-label-left, 0.75rem);
        width: max-content;
        max-width: var(--jf-search-label-width, calc(100% - 1.5rem));
        overflow: hidden;
        color: var(--text-secondary);
        font-family: var(--font-geist-sans), sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
        opacity: 1;
        transform: translateY(-50%) scale(1);
        transform-origin: left top;
        transition:
          top 180ms cubic-bezier(0.22, 1, 0.36, 1),
          transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 140ms ease;
      }

      [data-jf-search-host="true"]:has(
          input[data-jf-floating-search="true"]:focus
        )::after,
      [data-jf-search-host="true"]:has(
          input[data-jf-floating-search="true"]:not(:placeholder-shown)
        )::after {
        top: var(--jf-search-label-active-top, 0.2rem);
        opacity: 0.9;
        transform: translateY(0) scale(0.72);
      }

      [data-jf-search-host="true"]:has(
          input[data-jf-floating-search="true"][aria-hidden="true"]
        )::after {
        opacity: 0;
      }

      input[data-jf-floating-search="true"]::placeholder {
        color: transparent !important;
        opacity: 0 !important;
      }

      [data-jf-search-host="true"]:has(
          input[data-jf-floating-search="true"]:focus
        )
        input[data-jf-floating-search="true"],
      [data-jf-search-host="true"]:has(
          input[data-jf-floating-search="true"]:not(:placeholder-shown)
        )
        input[data-jf-floating-search="true"] {
        translate: 0 0.22rem;
      }

      input[data-jf-floating-search="true"] {
        transition:
          width 200ms ease,
          opacity 200ms ease,
          translate 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        [data-jf-search-host="true"]::after,
        input[data-jf-floating-search="true"] {
          transition-duration: 1ms !important;
        }
      }
    `}</style>
  );
}

function MobileHeaderSearchStyles() {
  return (
    <style jsx global>{`
      @media (max-width: 1023px) {
        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"] {
          border-radius: clamp(1.1rem, 2.5vw, 1.45rem);
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:first-child,
        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:last-child {
          border-radius: 999px !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          > button:first-child {
          color: var(--text-secondary) !important;
        }

        form[data-mobile-control-cluster][role="search"][aria-label="Search transactions"]
          input {
          color: var(--text-primary) !important;
          caret-color: var(--brand) !important;
        }
      }
    `}</style>
  );
}

export default function ResponsiveDashboardHeader({
  notificationSlot,
}: ResponsiveDashboardHeaderProps) {
  const [mode, setMode] = useState<HeaderMode>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateMode = () => {
      setMode(mediaQuery.matches ? "desktop" : "compact");
    };

    updateMode();
    mediaQuery.addEventListener("change", updateMode);

    return () => mediaQuery.removeEventListener("change", updateMode);
  }, []);

  if (mode === null) {
    return (
      <>
        <GlobalFloatingSearchPlaceholders />
        <div
          aria-hidden="true"
          className="min-h-0 shrink-0 print:hidden lg:min-h-[88px]"
        />
      </>
    );
  }

  if (mode === "desktop") {
    return (
      <div className="jf-dashboard-header-wrap shrink-0 print:hidden">
        <GlobalFloatingSearchPlaceholders />
        <style jsx global>{`
          @media (min-width: 1024px) {
            .jf-dashboard-header-wrap,
            .jf-dashboard-header-wrap .jf-desktop-header {
              border: 0 !important;
              background: var(--background) !important;
              box-shadow: none !important;
            }

            .jf-dashboard-header-wrap .jf-desktop-header > div {
              border: 0 !important;
            }
          }
        `}</style>
        <HeaderSearchOpenFallback />
        <DesktopHeader notificationSlot={notificationSlot} />
        <HeaderSearchAutoClose />
      </div>
    );
  }

  return (
    <>
      <GlobalFloatingSearchPlaceholders />
      <CompactHeader notificationSlot={notificationSlot} />
      <MobileHeaderSearchStyles />
    </>
  );
}
