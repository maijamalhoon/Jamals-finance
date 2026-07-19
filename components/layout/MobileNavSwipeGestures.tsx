"use client";

import Link from "next/link";
import { CircleDollarSign, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";

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

function hasVisibleBlockingSurface() {
  return Array.from(document.querySelectorAll(BLOCKING_SURFACE_SELECTOR)).some(
    (surface) => isVisible(surface),
  );
}

function shouldIgnoreSwipe(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
    : false;
}

export default function MobileNavSwipeGestures() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const gestureRef = useRef<SwipeGesture | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

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

      const drawerWasOpen = openRef.current;
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
      suppressClickUntilRef.current = performance.now() + CLICK_SUPPRESSION_MS;
      setOpen(!gesture.drawerWasOpen);
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        data-swipe-mobile-navigation-drawer
        side="left"
        showCloseButton={false}
        className="h-dvh max-h-dvh !w-[min(86vw,20rem)] max-w-[20rem] gap-0 overflow-hidden rounded-r-[26px] border-border/80 bg-surface-elevated/98 p-0 shadow-[24px_0_70px_rgb(15_23_42_/_0.2)] backdrop-blur-xl sm:!w-[22rem] sm:max-w-[22rem] dark:shadow-[24px_0_70px_rgb(0_0_0_/_0.48)] lg:hidden"
      >
        <SheetHeader className="border-b border-border/70 px-4 pb-3.5 pt-[max(0.95rem,env(safe-area-inset-top))] sm:px-4.5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand text-primary-foreground shadow-[0_8px_18px_color-mix(in_srgb,var(--brand)_22%,transparent)]">
                <CircleDollarSign
                  size={18}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[16px] font-black tracking-[-0.02em] text-text-primary">
                  Jamal&apos;s Finance
                </SheetTitle>
                <SheetDescription className="mt-0.5 truncate text-[9.5px] font-bold uppercase tracking-[0.15em] text-text-tertiary">
                  Personal workspace
                </SheetDescription>
              </div>
            </div>

            <SheetClose
              className="finance-focus grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-transparent text-text-secondary transition-[background-color,border-color,color] hover:border-border hover:bg-surface-soft hover:text-text-primary"
              aria-label="Close navigation menu"
            >
              <X size={18} strokeWidth={2.2} aria-hidden="true" />
            </SheetClose>
          </div>
        </SheetHeader>

        <nav
          aria-label="Swipe mobile dashboard navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4.5"
        >
          <div className="space-y-3.5">
            {NAV_GROUPS.map((group) => {
              const singleItem = group.items.length === 1;
              const sectionId = `swipe-mobile-navigation-${group.label.toLowerCase()}`;

              return (
                <section key={group.label} aria-labelledby={sectionId}>
                  <div className="mb-1.5 flex items-center gap-2 px-1.5">
                    <h2
                      id={sectionId}
                      className="text-[9px] font-black uppercase tracking-[0.17em] text-text-tertiary"
                    >
                      {group.label}
                    </h2>
                    <span
                      className="h-px min-w-0 flex-1 bg-divider/60"
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className={
                      singleItem
                        ? "grid grid-cols-1 gap-2"
                        : "grid grid-cols-2 gap-2"
                    }
                  >
                    {group.items.map(({ label, href, icon: Icon }) => {
                      const active = isNavItemActive(pathname, href);

                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`finance-focus group relative flex min-h-[3.25rem] min-w-0 items-center gap-2 rounded-[14px] border px-2.5 py-2 text-[12px] font-extrabold transition-[background-color,border-color,color,box-shadow,transform] active:scale-[0.985] sm:min-h-[3.45rem] sm:px-3 sm:text-[13px] ${
                            active
                              ? "border-brand bg-brand text-primary-foreground shadow-[0_8px_20px_color-mix(in_srgb,var(--brand)_20%,transparent)]"
                              : "border-transparent bg-surface-secondary/55 text-text-secondary hover:border-border/80 hover:bg-surface-soft hover:text-text-primary"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-[background-color,color] ${
                              active
                                ? "bg-white/15 text-primary-foreground"
                                : "bg-surface-primary/85 text-text-secondary group-hover:text-brand"
                            }`}
                          >
                            <Icon
                              size={16}
                              strokeWidth={2.15}
                              aria-hidden="true"
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
