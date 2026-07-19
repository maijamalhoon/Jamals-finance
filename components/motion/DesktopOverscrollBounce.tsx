"use client";

import { useEffect } from "react";

import {
  applyOverscrollImpulse,
  canConsumeVerticalScroll,
  classifyOverscrollInput,
  getOverscrollMotionProfile,
  isOverscrollSpringSettled,
  normalizeWheelDelta,
  resolveOverscrollDirection,
  stepOverscrollSpring,
  type OverscrollMotionProfile,
  type OverscrollSpringState,
} from "@/lib/overscroll-bounce";

import styles from "./DesktopOverscrollBounce.module.css";

const OFFSET_PROPERTY = "--jf-desktop-overscroll-y";
const EDGE_EPSILON = 1.5;

const BLOCKED_SURFACE_SELECTOR = [
  "[role='dialog']",
  "[aria-modal='true']",
  "[role='menu']",
  "[data-radix-popper-content-wrapper]",
  "[data-sonner-toaster]",
  "[data-overscroll-bounce='off']",
].join(",");

const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
].join(",");

const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
  " ",
]);

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

function canElementConsumeScroll(element: HTMLElement, deltaY: number) {
  return (
    isScrollable(element) &&
    canConsumeVerticalScroll({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      deltaY,
      epsilon: EDGE_EPSILON,
    })
  );
}

function findScrollableConsumer(
  element: HTMLElement,
  boundary: HTMLElement,
  deltaY: number,
) {
  let current: HTMLElement | null = element;

  while (current && current !== boundary && current !== document.body) {
    if (canElementConsumeScroll(current, deltaY)) return current;
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

function resolveDashboardSurface(target: HTMLElement, deltaY: number) {
  const dashboardShell = target.closest<HTMLElement>("[data-dashboard-shell]");
  const dashboardScroll =
    target.closest<HTMLElement>("[data-dashboard-scroll]") ??
    dashboardShell?.querySelector<HTMLElement>("[data-dashboard-scroll]") ??
    null;

  if (!dashboardScroll) return null;

  if (
    dashboardScroll.contains(target) &&
    findScrollableConsumer(target, dashboardScroll, deltaY)
  ) {
    return null;
  }

  const dashboardContent =
    dashboardScroll.querySelector<HTMLElement>(".jf-dashboard-content-frame") ??
    (dashboardScroll.firstElementChild instanceof HTMLElement
      ? dashboardScroll.firstElementChild
      : null);

  return dashboardContent
    ? { scrollElement: dashboardScroll, bounceTarget: dashboardContent }
    : null;
}

function resolveScrollSurface(
  eventTarget: EventTarget | null,
  deltaY: number,
): ScrollSurface | null {
  const target = resolveHtmlTarget(eventTarget);
  if (!target) return null;

  if (
    target.closest(BLOCKED_SURFACE_SELECTOR) ||
    target.closest(EDITABLE_SELECTOR)
  ) {
    return null;
  }

  const dashboardSurface = resolveDashboardSurface(target, deltaY);
  if (dashboardSurface) return dashboardSurface;

  if (findScrollableConsumer(target, document.body, deltaY)) return null;

  const scrollingElement = document.scrollingElement;
  const bodyRoot = findBodyRoot(target);

  if (!(scrollingElement instanceof HTMLElement) || !bodyRoot) return null;

  const bodyOverflow = window.getComputedStyle(document.body).overflowY;
  const htmlOverflow = window.getComputedStyle(document.documentElement).overflowY;
  if (bodyOverflow === "hidden" || htmlOverflow === "hidden") return null;

  return { scrollElement: scrollingElement, bounceTarget: bodyRoot };
}

export default function DesktopOverscrollBounce() {
  useEffect(() => {
    const desktopPointer = window.matchMedia(
      "(any-hover: hover) and (any-pointer: fine)",
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let activeTarget: HTMLElement | null = null;
    let activeScrollElement: HTMLElement | null = null;
    let activeProfile: OverscrollMotionProfile | null = null;
    let springState: OverscrollSpringState = { offset: 0, velocity: 0 };
    let targetOffset = 0;
    let frameId: number | null = null;
    let releaseTimer: number | null = null;
    let lastFrameTime = 0;
    let releasing = false;

    const clearReleaseTimer = () => {
      if (releaseTimer !== null) window.clearTimeout(releaseTimer);
      releaseTimer = null;
    };

    const hardReset = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      clearReleaseTimer();

      frameId = null;
      lastFrameTime = 0;
      targetOffset = 0;
      releasing = false;
      springState = { offset: 0, velocity: 0 };
      activeProfile = null;
      activeScrollElement = null;

      if (!activeTarget) return;

      activeTarget.classList.remove(styles.bounceTarget);
      activeTarget.style.removeProperty(OFFSET_PROPERTY);
      activeTarget = null;
    };

    const renderFrame = (timestamp: number) => {
      frameId = null;
      if (!activeTarget || !activeProfile) return;

      const elapsed = lastFrameTime
        ? Math.min(34, Math.max(4, timestamp - lastFrameTime))
        : 1000 / 60;
      lastFrameTime = timestamp;

      springState = stepOverscrollSpring(
        springState,
        targetOffset,
        elapsed,
        activeProfile,
        releasing,
      );

      activeTarget.style.setProperty(
        OFFSET_PROPERTY,
        `${springState.offset.toFixed(3)}px`,
      );

      if (isOverscrollSpringSettled(springState, targetOffset)) {
        springState = { offset: targetOffset, velocity: 0 };
        activeTarget.style.setProperty(
          OFFSET_PROPERTY,
          `${targetOffset.toFixed(3)}px`,
        );
        lastFrameTime = 0;

        if (releasing) hardReset();
        return;
      }

      frameId = window.requestAnimationFrame(renderFrame);
    };

    const ensureFrame = () => {
      if (frameId !== null || !activeTarget || !activeProfile) return;
      lastFrameTime = 0;
      frameId = window.requestAnimationFrame(renderFrame);
    };

    const release = () => {
      clearReleaseTimer();
      if (!activeTarget) return;

      targetOffset = 0;
      releasing = true;
      ensureFrame();
    };

    const prepareSurface = (
      surface: ScrollSurface,
      profile: OverscrollMotionProfile,
    ) => {
      if (
        activeTarget !== surface.bounceTarget ||
        activeScrollElement !== surface.scrollElement
      ) {
        hardReset();
        activeTarget = surface.bounceTarget;
        activeScrollElement = surface.scrollElement;
        activeTarget.classList.add(styles.bounceTarget);
      }

      activeProfile = profile;
      releasing = false;
    };

    const queueRelease = (delay: number) => {
      clearReleaseTimer();
      releaseTimer = window.setTimeout(release, delay);
    };

    const handleWheel = (event: WheelEvent) => {
      const shouldIgnore =
        !desktopPointer.matches ||
        reducedMotion.matches ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY);

      if (shouldIgnore) {
        release();
        return;
      }

      const normalizedDelta = normalizeWheelDelta(
        event.deltaY,
        event.deltaMode,
        window.innerHeight,
      );
      if (Math.abs(normalizedDelta) < 0.01) return;

      const surface = resolveScrollSurface(event.target, normalizedDelta);
      if (!surface) {
        release();
        return;
      }

      const direction = resolveOverscrollDirection({
        scrollTop: surface.scrollElement.scrollTop,
        scrollHeight: surface.scrollElement.scrollHeight,
        clientHeight: surface.scrollElement.clientHeight,
        deltaY: normalizedDelta,
        epsilon: EDGE_EPSILON,
      });

      if (!direction || !event.cancelable) {
        release();
        return;
      }

      event.preventDefault();

      const inputKind = classifyOverscrollInput(
        normalizedDelta,
        event.deltaMode,
      );
      const profile = getOverscrollMotionProfile(
        window.innerWidth,
        inputKind,
      );

      prepareSurface(surface, profile);

      if (
        Math.abs(targetOffset) > 0.01 &&
        Math.sign(targetOffset) !== direction
      ) {
        targetOffset = springState.offset * 0.25;
        springState.velocity *= 0.35;
      } else if (
        Math.abs(springState.offset) > 0.01 &&
        Math.sign(springState.offset) !== direction
      ) {
        springState.velocity *= 0.35;
      }

      targetOffset = applyOverscrollImpulse(
        targetOffset,
        normalizedDelta,
        direction,
        profile,
      );

      ensureFrame();
      queueRelease(profile.releaseDelay);
    };

    const handleDocumentScroll = (event: Event) => {
      if (!activeScrollElement) return;

      const isRootScroll =
        activeScrollElement === document.scrollingElement &&
        (event.target === document ||
          event.target === document.documentElement ||
          event.target === document.body);

      if (event.target === activeScrollElement || isRootScroll) release();
    };

    const handleRootScroll = () => {
      if (activeScrollElement === document.scrollingElement) release();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) release();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") hardReset();
    };

    const handleMediaChange = () => {
      if (!desktopPointer.matches || reducedMotion.matches) hardReset();
    };

    const handleViewportChange = () => release();

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleRootScroll, { passive: true });
    window.addEventListener("blur", hardReset);
    window.addEventListener("pagehide", hardReset);
    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("orientationchange", handleViewportChange, {
      passive: true,
    });
    window.addEventListener("pointerdown", release, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleDocumentScroll, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    desktopPointer.addEventListener("change", handleMediaChange);
    reducedMotion.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleRootScroll);
      window.removeEventListener("blur", hardReset);
      window.removeEventListener("pagehide", hardReset);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleDocumentScroll, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      desktopPointer.removeEventListener("change", handleMediaChange);
      reducedMotion.removeEventListener("change", handleMediaChange);
      hardReset();
    };
  }, []);

  return null;
}
