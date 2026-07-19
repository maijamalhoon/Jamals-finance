"use client";

import { useEffect, useRef } from "react";

type SwipeIntent = "pending" | "horizontal" | "vertical";

type SwipeGesture = {
  startX: number;
  startY: number;
  startTime: number;
  drawerWasOpen: boolean;
  intent: SwipeIntent;
};

const MOBILE_VIEWPORT_QUERY = "(max-width: 1023px)";
const AXIS_LOCK_DISTANCE = 8;
const HORIZONTAL_DOMINANCE = 1.1;
const SWIPE_DISTANCE = 44;
const QUICK_FLICK_DISTANCE = 26;
const QUICK_FLICK_VELOCITY = 0.24;
const CLICK_SUPPRESSION_MS = 480;

const SWIPE_IGNORE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  '[contenteditable="true"]',
  '[data-swipe-navigation-ignore]',
].join(",");

const BLOCKING_SURFACE_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
].join(",");

function isVisible(element: Element) {
  if (!(element instanceof HTMLElement)) return false;

  const styles = window.getComputedStyle(element);
  const bounds = element.getBoundingClientRect();

  return (
    !element.hidden &&
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    Number(styles.opacity) > 0 &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function getOriginalDrawer() {
  return document.querySelector<HTMLElement>(
    "[data-mobile-navigation-drawer]",
  );
}

function getOriginalTrigger() {
  return document.querySelector<HTMLElement>(
    '[data-mobile-control-cluster] [data-slot="sheet-trigger"]',
  );
}

function isOriginalDrawerOpen() {
  const trigger = getOriginalTrigger();
  const drawer = getOriginalDrawer();

  return (
    trigger?.getAttribute("aria-expanded") === "true" ||
    Boolean(drawer && isVisible(drawer))
  );
}

function hasVisibleBlockingSurface() {
  return Array.from(document.querySelectorAll(BLOCKING_SURFACE_SELECTOR)).some(
    (surface) =>
      !surface.matches("[data-mobile-navigation-drawer]") && isVisible(surface),
  );
}

function shouldIgnoreSwipe(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
    : false;
}

function openOriginalDrawer() {
  const trigger = getOriginalTrigger();
  if (!trigger || trigger.getAttribute("aria-expanded") === "true") return;

  const inertHost = trigger.closest<HTMLElement>("[inert]");
  const hadInert = Boolean(inertHost?.hasAttribute("inert"));
  const previousAriaHidden = inertHost?.getAttribute("aria-hidden") ?? null;

  if (hadInert) inertHost?.removeAttribute("inert");
  if (inertHost) inertHost.setAttribute("aria-hidden", "false");

  trigger.click();

  window.requestAnimationFrame(() => {
    if (!inertHost) return;

    if (hadInert && trigger.getAttribute("aria-expanded") !== "true") {
      inertHost.setAttribute("inert", "");
    }

    if (previousAriaHidden === null) inertHost.removeAttribute("aria-hidden");
    else inertHost.setAttribute("aria-hidden", previousAriaHidden);
  });
}

function closeOriginalDrawer() {
  const drawer = getOriginalDrawer();
  const closeButton = drawer?.querySelector<HTMLElement>(
    '[data-slot="sheet-close"]',
  );

  if (closeButton) {
    closeButton.click();
    return;
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

export default function MobileNavSwipeGestures() {
  const gestureRef = useRef<SwipeGesture | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_VIEWPORT_QUERY);

    const clearGesture = () => {
      gestureRef.current = null;
    };

    const beginGesture = (
      clientX: number,
      clientY: number,
      target: EventTarget | null,
    ) => {
      clearGesture();

      if (!mobileViewport.matches || shouldIgnoreSwipe(target)) return;

      const drawerWasOpen = isOriginalDrawerOpen();
      if (!drawerWasOpen && hasVisibleBlockingSurface()) return;

      gestureRef.current = {
        startX: clientX,
        startY: clientY,
        startTime: performance.now(),
        drawerWasOpen,
        intent: "pending",
      };
    };

    const updateGesture = (
      clientX: number,
      clientY: number,
      preventDefault: () => void,
    ) => {
      const gesture = gestureRef.current;
      if (!gesture) return;

      const deltaX = clientX - gesture.startX;
      const deltaY = clientY - gesture.startY;
      const absoluteX = Math.abs(deltaX);
      const absoluteY = Math.abs(deltaY);

      if (gesture.intent === "pending") {
        if (Math.max(absoluteX, absoluteY) < AXIS_LOCK_DISTANCE) return;

        gesture.intent =
          absoluteX >= absoluteY * HORIZONTAL_DOMINANCE
            ? "horizontal"
            : "vertical";
      }

      if (gesture.intent !== "horizontal") return;

      const movingInExpectedDirection = gesture.drawerWasOpen
        ? deltaX < 0
        : deltaX > 0;

      if (movingInExpectedDirection) preventDefault();
    };

    const finishGesture = (
      clientX: number,
      clientY: number,
      preventDefault: () => void,
      stopPropagation: () => void,
    ) => {
      const gesture = gestureRef.current;
      clearGesture();
      if (!gesture || gesture.intent !== "horizontal") return;

      const deltaX = clientX - gesture.startX;
      const deltaY = clientY - gesture.startY;
      const directionalDistance = gesture.drawerWasOpen ? -deltaX : deltaX;
      const elapsed = Math.max(1, performance.now() - gesture.startTime);
      const velocity = directionalDistance / elapsed;
      const isHorizontal =
        Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_DOMINANCE;
      const reachedDistance = directionalDistance >= SWIPE_DISTANCE;
      const isQuickFlick =
        directionalDistance >= QUICK_FLICK_DISTANCE &&
        velocity >= QUICK_FLICK_VELOCITY;

      if (!isHorizontal || (!reachedDistance && !isQuickFlick)) return;

      preventDefault();
      stopPropagation();

      if (gesture.drawerWasOpen) closeOriginalDrawer();
      else openOriginalDrawer();

      suppressClickUntilRef.current = performance.now() + CLICK_SUPPRESSION_MS;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        clearGesture();
        return;
      }

      const touch = event.touches[0];
      beginGesture(touch.clientX, touch.clientY, event.target);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      updateGesture(touch.clientX, touch.clientY, () => {
        if (event.cancelable) event.preventDefault();
      });
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        clearGesture();
        return;
      }

      finishGesture(
        touch.clientX,
        touch.clientY,
        () => {
          if (event.cancelable) event.preventDefault();
        },
        () => event.stopPropagation(),
      );
    };

    const handleTouchCancel = () => clearGesture();

    const handleClickCapture = (event: MouseEvent) => {
      if (performance.now() >= suppressClickUntilRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchcancel", handleTouchCancel, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", handleClickCapture, true);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, true);
      document.removeEventListener("touchmove", handleTouchMove, true);
      document.removeEventListener("touchend", handleTouchEnd, true);
      document.removeEventListener("touchcancel", handleTouchCancel, true);
      document.removeEventListener("click", handleClickCapture, true);
      clearGesture();
    };
  }, []);

  return null;
}
