"use client";

import { useEffect } from "react";

import FinancePickerKeyboardGuard from "@/components/forms/FinancePickerKeyboardGuard";

const BODY_CONTACT_ATTRIBUTE = "data-mobile-scroll-contact";
const BODY_TOP_ATTRIBUTE = "data-mobile-dashboard-top";
const BODY_REVEAL_ATTRIBUTE = "data-mobile-scroll-reveal";
const TOP_THRESHOLD = 1;
const SCROLL_DIRECTION_THRESHOLD = 1;
const RELEASE_REVEAL_DELAY = 1_000;
const REVEAL_VISIBLE_DURATION = 2_000;

type ScrollDirection = "up" | "down" | null;

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
    let touchReleasePending = false;
    let syncingTopState = false;
    let lastScrollTop = Math.max(0, scrollContainer.scrollTop);
    let lastScrollDirection: ScrollDirection = null;
    let revealDelayTimer: number | null = null;
    let revealHideTimer: number | null = null;
    let wheelIdleTimer: number | null = null;

    const clearRevealDelayTimer = () => {
      if (revealDelayTimer === null) return;
      window.clearTimeout(revealDelayTimer);
      revealDelayTimer = null;
    };

    const clearRevealHideTimer = () => {
      if (revealHideTimer === null) return;
      window.clearTimeout(revealHideTimer);
      revealHideTimer = null;
    };

    const clearWheelIdleTimer = () => {
      if (wheelIdleTimer === null) return;
      window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = null;
    };

    const setContactState = (active: boolean) => {
      if (active) {
        document.body.setAttribute(BODY_CONTACT_ATTRIBUTE, "true");
        return;
      }

      document.body.removeAttribute(BODY_CONTACT_ATTRIBUTE);
    };

    const setRevealState = (active: boolean) => {
      if (active) {
        document.body.setAttribute(BODY_REVEAL_ATTRIBUTE, "true");
        return;
      }

      document.body.removeAttribute(BODY_REVEAL_ATTRIBUTE);
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

    const beginTimedReveal = () => {
      clearRevealDelayTimer();
      clearRevealHideTimer();
      touchReleasePending = false;
      setContactState(false);

      if (lastScrollDirection !== "up" || isSearchExpanded()) {
        setRevealState(false);
        syncTopState();
        return;
      }

      setRevealState(true);
      syncTopState();
      revealHideTimer = window.setTimeout(() => {
        revealHideTimer = null;
        setRevealState(false);
        syncTopState();
      }, REVEAL_VISIBLE_DURATION);
    };

    const scheduleTouchReleaseReveal = () => {
      clearRevealDelayTimer();
      clearRevealHideTimer();
      clearWheelIdleTimer();
      setRevealState(false);
      setContactState(true);
      touchReleasePending = true;

      revealDelayTimer = window.setTimeout(() => {
        revealDelayTimer = null;
        beginTimedReveal();
      }, RELEASE_REVEAL_DELAY);
    };

    const scheduleWheelReveal = () => {
      clearWheelIdleTimer();
      wheelIdleTimer = window.setTimeout(() => {
        wheelIdleTimer = null;

        if (lastScrollDirection === "up") {
          beginTimedReveal();
          return;
        }

        setContactState(false);
        setRevealState(false);
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

      clearRevealDelayTimer();
      clearRevealHideTimer();
      clearWheelIdleTimer();
      setRevealState(false);
      touchReleasePending = false;
      activePointerId = event.pointerId;
      pointerStartedInsideScroll = true;
      didScrollDuringContact = false;
    };

    const handleScroll = () => {
      const nextScrollTop = Math.max(0, scrollContainer.scrollTop);
      const scrollDelta = nextScrollTop - lastScrollTop;

      if (Math.abs(scrollDelta) >= SCROLL_DIRECTION_THRESHOLD) {
        lastScrollDirection = scrollDelta < 0 ? "up" : "down";
        lastScrollTop = nextScrollTop;
      }

      if (activePointerId !== null && pointerStartedInsideScroll) {
        clearRevealDelayTimer();
        clearRevealHideTimer();
        clearWheelIdleTimer();
        setRevealState(false);
        didScrollDuringContact = true;
        setContactState(true);
        syncTopState();
        return;
      }

      if (touchReleasePending) {
        setContactState(true);
        syncTopState();
        return;
      }

      clearRevealDelayTimer();
      clearRevealHideTimer();
      setRevealState(false);
      setContactState(true);
      scheduleWheelReveal();
      syncTopState();
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      activePointerId = null;
      pointerStartedInsideScroll = false;

      if (didScrollDuringContact && lastScrollDirection === "up") {
        scheduleTouchReleaseReveal();
      } else {
        clearRevealDelayTimer();
        clearRevealHideTimer();
        clearWheelIdleTimer();
        touchReleasePending = false;
        setContactState(false);
        setRevealState(false);
        syncTopState();
      }

      didScrollDuringContact = false;
    };

    const resetContact = () => {
      clearRevealDelayTimer();
      clearRevealHideTimer();
      clearWheelIdleTimer();
      activePointerId = null;
      pointerStartedInsideScroll = false;
      didScrollDuringContact = false;
      touchReleasePending = false;
      setContactState(false);
      setRevealState(false);
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
      clearRevealDelayTimer();
      clearRevealHideTimer();
      clearWheelIdleTimer();
      scrollContainer.removeEventListener("pointerdown", handlePointerDown);
      scrollContainer.removeEventListener("scroll", handleScroll);
      document.removeEventListener("pointerup", releasePointer, true);
      document.removeEventListener("pointercancel", releasePointer, true);
      window.removeEventListener("blur", resetContact);
      window.removeEventListener("resize", syncTopState);
      activePointerId = null;
      pointerStartedInsideScroll = false;
      didScrollDuringContact = false;
      touchReleasePending = false;
      document.body.removeAttribute(BODY_CONTACT_ATTRIBUTE);
      document.body.removeAttribute(BODY_REVEAL_ATTRIBUTE);
      document.body.removeAttribute(BODY_TOP_ATTRIBUTE);
    };
  }, []);

  return <FinancePickerKeyboardGuard />;
}
