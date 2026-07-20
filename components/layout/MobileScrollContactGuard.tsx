"use client";

import { useEffect } from "react";

import FinancePickerKeyboardGuard from "@/components/forms/FinancePickerKeyboardGuard";

const BODY_CONTACT_ATTRIBUTE = "data-mobile-scroll-contact";
const BODY_TOP_ATTRIBUTE = "data-mobile-dashboard-top";
const TOP_THRESHOLD = 1;
const RELEASE_REVEAL_DELAY = 700;

function isSearchExpanded() {
  return Boolean(
    document.querySelector(
      '#mobile-inline-transaction-search[aria-hidden="false"]',
    ),
  );
}

function getMobileControlClusters() {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-mobile-control-cluster]"),
  );
}

function restoreClusterAccessibility() {
  getMobileControlClusters().forEach((cluster) => {
    const inlineOpacity = Number.parseFloat(cluster.style.opacity);
    const hidden = Number.isFinite(inlineOpacity)
      ? inlineOpacity < 0.5
      : cluster.getAttribute("aria-hidden") === "true";

    if (hidden) {
      cluster.setAttribute("aria-hidden", "true");
      cluster.setAttribute("inert", "");
      return;
    }

    cluster.setAttribute("aria-hidden", "false");
    cluster.removeAttribute("inert");
  });
}

function keepTopClustersInteractive() {
  getMobileControlClusters().forEach((cluster) => {
    if (cluster.getAttribute("aria-hidden") !== "false") {
      cluster.setAttribute("aria-hidden", "false");
    }
    if (cluster.hasAttribute("inert")) cluster.removeAttribute("inert");
  });
}

export default function MobileScrollContactGuard() {
  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scrollContainer) return;

    let activePointerId: number | null = null;
    let pointerStartedInsideScroll = false;
    let didScrollDuringContact = false;
    let syncingTopState = false;
    let releaseTimer: number | null = null;

    const clearReleaseTimer = () => {
      if (releaseTimer === null) return;
      window.clearTimeout(releaseTimer);
      releaseTimer = null;
    };

    const setContactState = (active: boolean) => {
      if (active) {
        document.body.setAttribute(BODY_CONTACT_ATTRIBUTE, "true");
        return;
      }

      document.body.removeAttribute(BODY_CONTACT_ATTRIBUTE);
    };

    const syncTopState = () => {
      if (syncingTopState) return;
      syncingTopState = true;

      const atTop = scrollContainer.scrollTop <= TOP_THRESHOLD;
      const searchExpanded = isSearchExpanded();
      const contactActive = document.body.hasAttribute(BODY_CONTACT_ATTRIBUTE);

      if (atTop) {
        document.body.setAttribute(BODY_TOP_ATTRIBUTE, "true");

        if (!searchExpanded && !contactActive) keepTopClustersInteractive();
        else restoreClusterAccessibility();
      } else {
        document.body.removeAttribute(BODY_TOP_ATTRIBUTE);
        restoreClusterAccessibility();
      }

      window.requestAnimationFrame(() => {
        syncingTopState = false;
      });
    };

    const releaseContactAfterDelay = () => {
      clearReleaseTimer();
      releaseTimer = window.setTimeout(() => {
        releaseTimer = null;
        setContactState(false);
        syncTopState();
      }, RELEASE_REVEAL_DELAY);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !event.isPrimary ||
        (event.pointerType !== "touch" && event.pointerType !== "pen")
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || !scrollContainer.contains(target)) return;

      clearReleaseTimer();
      activePointerId = event.pointerId;
      pointerStartedInsideScroll = true;
      didScrollDuringContact = document.body.hasAttribute(
        BODY_CONTACT_ATTRIBUTE,
      );
    };

    const handleScroll = () => {
      if (activePointerId !== null && pointerStartedInsideScroll) {
        didScrollDuringContact = true;
        setContactState(true);
      }

      syncTopState();
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      activePointerId = null;
      pointerStartedInsideScroll = false;

      if (didScrollDuringContact) {
        releaseContactAfterDelay();
      } else {
        setContactState(false);
        syncTopState();
      }

      didScrollDuringContact = false;
    };

    const resetContact = () => {
      clearReleaseTimer();
      activePointerId = null;
      pointerStartedInsideScroll = false;
      didScrollDuringContact = false;
      setContactState(false);
      syncTopState();
    };

    const observer = new MutationObserver(() => {
      syncTopState();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-hidden", "inert"],
      childList: true,
      subtree: true,
    });

    syncTopState();

    scrollContainer.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("pointerup", releasePointer, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointercancel", releasePointer, {
      capture: true,
      passive: true,
    });
    window.addEventListener("blur", resetContact);
    window.addEventListener("resize", syncTopState);

    return () => {
      observer.disconnect();
      clearReleaseTimer();
      scrollContainer.removeEventListener("pointerdown", handlePointerDown);
      scrollContainer.removeEventListener("scroll", handleScroll);
      document.removeEventListener("pointerup", releasePointer, true);
      document.removeEventListener("pointercancel", releasePointer, true);
      window.removeEventListener("blur", resetContact);
      window.removeEventListener("resize", syncTopState);
      activePointerId = null;
      pointerStartedInsideScroll = false;
      didScrollDuringContact = false;
      document.body.removeAttribute(BODY_CONTACT_ATTRIBUTE);
      document.body.removeAttribute(BODY_TOP_ATTRIBUTE);
    };
  }, []);

  return <FinancePickerKeyboardGuard />;
}
