"use client";

import { useEffect, useRef } from "react";

type SwipeIntent = "pending" | "horizontal" | "vertical";

type SwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  drawerWasOpen: boolean;
  intent: SwipeIntent;
};

const MOBILE_VIEWPORT_QUERY = "(max-width: 1023px)";
const AXIS_LOCK_DISTANCE = 10;
const HORIZONTAL_DOMINANCE = 1.2;
const QUICK_FLICK_MIN_DISTANCE = 36;
const QUICK_FLICK_MIN_VELOCITY = 0.35;
const CLICK_SUPPRESSION_MS = 420;

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "summary",
  "form",
  "svg",
  "canvas",
  '[role="button"]',
  '[role="link"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[contenteditable="true"]',
  '[data-chart]',
  '[class*="recharts"]',
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
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function getMobileDrawer() {
  return document.querySelector<HTMLElement>(
    "[data-mobile-navigation-drawer]",
  );
}

function isDrawerOpen() {
  const drawer = getMobileDrawer();
  return Boolean(drawer && isVisible(drawer));
}

function hasOtherBlockingSurface() {
  return Array.from(document.querySelectorAll(BLOCKING_SURFACE_SELECTOR)).some(
    (surface) =>
      !surface.matches("[data-mobile-navigation-drawer]") && isVisible(surface),
  );
}

function isTransactionSearchOpen() {
  return Boolean(
    document.querySelector(
      'form[data-mobile-control-cluster][role="search"] [aria-expanded="true"]',
    ),
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest(INTERACTIVE_SELECTOR))
    : false;
}

function isInsideHorizontalScroller(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  let current: Element | null = target;

  while (current && current !== document.body) {
    if (current instanceof HTMLElement) {
      const styles = window.getComputedStyle(current);
      const canScrollHorizontally =
        current.scrollWidth > current.clientWidth + 2 &&
        ["auto", "scroll"].includes(styles.overflowX);

      if (canScrollHorizontally) return true;
    }

    current = current.parentElement;
  }

  return false;
}

function openDrawer() {
  const trigger = document.querySelector<HTMLElement>(
    '[data-mobile-control-cluster] [data-slot="sheet-trigger"]',
  );

  if (!trigger || trigger.getAttribute("aria-expanded") === "true") return;
  trigger.click();
}

function closeDrawer() {
  const drawer = getMobileDrawer();
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

function getSwipeDistance() {
  return Math.min(88, Math.max(58, window.innerWidth * 0.16));
}

export default function MobileNavSwipeGestures() {
  const gestureRef = useRef<SwipeGesture | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_VIEWPORT_QUERY);

    const clearGesture = () => {
      gestureRef.current = null;
    };

    const handlePointerDown = (event: PointerEvent) => {
      clearGesture();

      if (
        !mobileViewport.matches ||
        !event.isPrimary ||
        event.button !== 0 ||
        event.pointerType === "mouse"
      ) {
        return;
      }

      const drawerOpen = isDrawerOpen();

      if (!drawerOpen) {
        if (
          isTransactionSearchOpen() ||
          hasOtherBlockingSurface() ||
          isInteractiveTarget(event.target) ||
          isInsideHorizontalScroller(event.target)
        ) {
          return;
        }
      }

      gestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        drawerWasOpen: drawerOpen,
        intent: "pending",
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
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

      if (movingInExpectedDirection) event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      clearGesture();
      if (gesture.intent !== "horizontal") return;

      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const directionalDistance = gesture.drawerWasOpen ? -deltaX : deltaX;
      const elapsed = Math.max(1, performance.now() - gesture.startTime);
      const velocity = directionalDistance / elapsed;
      const isHorizontal =
        Math.abs(deltaX) >= Math.abs(deltaY) * HORIZONTAL_DOMINANCE;
      const reachedDistance = directionalDistance >= getSwipeDistance();
      const isQuickFlick =
        directionalDistance >= QUICK_FLICK_MIN_DISTANCE &&
        velocity >= QUICK_FLICK_MIN_VELOCITY;

      if (!isHorizontal || (!reachedDistance && !isQuickFlick)) return;

      event.preventDefault();
      event.stopPropagation();

      if (gesture.drawerWasOpen) closeDrawer();
      else openDrawer();

      suppressClickUntilRef.current = performance.now() + CLICK_SUPPRESSION_MS;
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (gestureRef.current?.pointerId === event.pointerId) clearGesture();
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (performance.now() >= suppressClickUntilRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("pointerup", handlePointerUp, {
      capture: true,
      passive: false,
    });
    document.addEventListener("pointercancel", handlePointerCancel, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", handleClickCapture, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
      document.removeEventListener("click", handleClickCapture, true);
      clearGesture();
    };
  }, []);

  return null;
}
