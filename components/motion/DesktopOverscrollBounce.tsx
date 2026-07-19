"use client";

import { useEffect } from "react";

import styles from "./DesktopOverscrollBounce.module.css";

const OFFSET_PROPERTY = "--jf-desktop-overscroll-y";
const MAX_OFFSET = 48;
const EDGE_EPSILON = 1;
const RELEASE_DELAY = 95;
const SETTLE_DURATION = 380;

const BLOCKED_SURFACE_SELECTOR = [
  "[role='dialog']",
  "[role='menu']",
  "[data-radix-popper-content-wrapper]",
  "[data-sonner-toaster]",
].join(",");

const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
].join(",");

type ScrollSurface = {
  scrollElement: HTMLElement;
  bounceTarget: HTMLElement;
};

function isScrollable(element: HTMLElement) {
  const overflowY = window.getComputedStyle(element).overflowY;
  return (
    /(auto|scroll|overlay)/.test(overflowY) &&
    element.scrollHeight > element.clientHeight + EDGE_EPSILON
  );
}

function findNestedScrollArea(element: HTMLElement, boundary: HTMLElement) {
  let current: HTMLElement | null = element;

  while (current && current !== boundary && current !== document.body) {
    if (isScrollable(current)) return current;
    current = current.parentElement;
  }

  return null;
}

function findBodyRoot(element: HTMLElement) {
  let current: HTMLElement | null = element;

  while (current?.parentElement && current.parentElement !== document.body) {
    current = current.parentElement;
  }

  return current?.parentElement === document.body ? current : null;
}

function resolveHtmlTarget(eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof Element)) return null;
  return eventTarget instanceof HTMLElement
    ? eventTarget
    : eventTarget.parentElement;
}

function resolveScrollSurface(eventTarget: EventTarget | null): ScrollSurface | null {
  const target = resolveHtmlTarget(eventTarget);
  if (!target) return null;

  if (
    target.closest(BLOCKED_SURFACE_SELECTOR) ||
    target.closest(EDITABLE_SELECTOR)
  ) {
    return null;
  }

  const dashboardScroll = target.closest<HTMLElement>("[data-dashboard-scroll]");

  if (dashboardScroll) {
    if (findNestedScrollArea(target, dashboardScroll)) return null;

    const dashboardContent =
      dashboardScroll.querySelector<HTMLElement>(".jf-dashboard-content-frame") ??
      (dashboardScroll.firstElementChild instanceof HTMLElement
        ? dashboardScroll.firstElementChild
        : null);

    return dashboardContent
      ? { scrollElement: dashboardScroll, bounceTarget: dashboardContent }
      : null;
  }

  if (findNestedScrollArea(target, document.body)) return null;

  const scrollingElement = document.scrollingElement;
  const bodyRoot = findBodyRoot(target);

  if (!(scrollingElement instanceof HTMLElement) || !bodyRoot) return null;

  const bodyOverflow = window.getComputedStyle(document.body).overflowY;
  const htmlOverflow = window.getComputedStyle(document.documentElement).overflowY;
  if (bodyOverflow === "hidden" || htmlOverflow === "hidden") return null;

  return { scrollElement: scrollingElement, bounceTarget: bodyRoot };
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }
  return event.deltaY;
}

function readTranslateY(element: HTMLElement) {
  const translate = window.getComputedStyle(element).translate;
  if (!translate || translate === "none") return 0;

  const values = translate.split(/\s+/);
  const parsed = Number.parseFloat(values[1] ?? values[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function DesktopOverscrollBounce() {
  useEffect(() => {
    const desktopPointer = window.matchMedia(
      "(any-hover: hover) and (any-pointer: fine)",
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let activeTarget: HTMLElement | null = null;
    let offset = 0;
    let frameId: number | null = null;
    let releaseTimer: number | null = null;
    let settleTimer: number | null = null;

    const clearTimer = (timer: number | null) => {
      if (timer !== null) window.clearTimeout(timer);
    };

    const clearActiveTarget = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      clearTimer(releaseTimer);
      clearTimer(settleTimer);

      frameId = null;
      releaseTimer = null;
      settleTimer = null;
      offset = 0;

      if (!activeTarget) return;

      activeTarget.classList.remove(styles.bounceTarget, styles.settling);
      activeTarget.style.removeProperty(OFFSET_PROPERTY);
      activeTarget = null;
    };

    const writeOffset = () => {
      frameId = null;
      if (!activeTarget) return;
      activeTarget.style.setProperty(OFFSET_PROPERTY, `${offset}px`);
    };

    const queueOffset = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(writeOffset);
    };

    const prepareTarget = (target: HTMLElement) => {
      if (activeTarget === target) {
        if (settleTimer !== null) {
          offset = readTranslateY(target);
          clearTimer(settleTimer);
          settleTimer = null;
          target.classList.remove(styles.settling);
          target.style.setProperty(OFFSET_PROPERTY, `${offset}px`);
        }
        return;
      }

      clearActiveTarget();
      activeTarget = target;
      activeTarget.classList.add(styles.bounceTarget);
    };

    const release = () => {
      clearTimer(releaseTimer);
      releaseTimer = null;

      if (!activeTarget) return;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }

      activeTarget.classList.add(styles.settling);
      activeTarget.style.setProperty(OFFSET_PROPERTY, "0px");
      offset = 0;

      clearTimer(settleTimer);
      settleTimer = window.setTimeout(clearActiveTarget, SETTLE_DURATION + 40);
    };

    const handleWheel = (event: WheelEvent) => {
      if (
        !desktopPointer.matches ||
        reducedMotion.matches ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        return;
      }

      const deltaY = normalizeWheelDelta(event);
      if (!deltaY) return;

      const surface = resolveScrollSurface(event.target);
      if (!surface) {
        release();
        return;
      }

      const { scrollElement, bounceTarget } = surface;
      const maxScroll = Math.max(
        0,
        scrollElement.scrollHeight - scrollElement.clientHeight,
      );
      const atTop = scrollElement.scrollTop <= EDGE_EPSILON;
      const atBottom = scrollElement.scrollTop >= maxScroll - EDGE_EPSILON;
      const pullingPastTop = deltaY < 0 && atTop;
      const pullingPastBottom = deltaY > 0 && atBottom;

      if (!pullingPastTop && !pullingPastBottom) {
        release();
        return;
      }

      event.preventDefault();
      prepareTarget(bounceTarget);

      const limitedDelta = Math.min(Math.abs(deltaY), 110);
      const resistance = Math.max(0.22, 1 - Math.abs(offset) / MAX_OFFSET);
      const direction = deltaY < 0 ? 1 : -1;
      offset += direction * limitedDelta * 0.16 * resistance;
      offset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset));
      queueOffset();

      clearTimer(releaseTimer);
      releaseTimer = window.setTimeout(release, RELEASE_DELAY);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") clearActiveTarget();
    };

    const handleMediaChange = () => {
      if (!desktopPointer.matches || reducedMotion.matches) clearActiveTarget();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("blur", clearActiveTarget);
    window.addEventListener("resize", release, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    desktopPointer.addEventListener("change", handleMediaChange);
    reducedMotion.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("blur", clearActiveTarget);
      window.removeEventListener("resize", release);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      desktopPointer.removeEventListener("change", handleMediaChange);
      reducedMotion.removeEventListener("change", handleMediaChange);
      clearActiveTarget();
    };
  }, []);

  return null;
}
