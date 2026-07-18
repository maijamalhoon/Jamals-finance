"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { CircleDollarSign, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import JamalMenu from "@/components/layout/JamalMenu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";

type MobileNavProps = {
  notificationSlot: ReactNode;
};

type TapGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollTop: number;
  moved: boolean;
};

type ScrollDirection = "up" | "down" | null;

const AUTO_HIDE_DELAY = 2_000;
const SCROLL_IDLE_DELAY = 140;
const SCROLL_DIRECTION_THRESHOLD = 1;
const TAP_MOVE_TOLERANCE = 10;
const CONTROL_EASE = [0.22, 1, 0.36, 1] as const;
const SEARCH_EASE = [0.16, 1, 0.3, 1] as const;

const INTERACTIVE_TAP_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "summary",
  "form",
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
  '[role="dialog"]',
  "[aria-haspopup]",
  '[contenteditable="true"]',
  '[data-slot$="-trigger"]',
  '[data-slot="dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const BLOCKING_SURFACE_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
].join(",");

function isInteractiveTapTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest(INTERACTIVE_TAP_SELECTOR))
    : false;
}

function hasBlockingSurface() {
  return Boolean(document.querySelector(BLOCKING_SURFACE_SELECTOR));
}

export default function MobileNav({ notificationSlot }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [controlsVisible, setControlsVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(390);
  const hideTimerRef = useRef<number | null>(null);
  const tapRevealTimerRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const tapGestureRef = useRef<TapGesture | null>(null);
  const lastScrollTopRef = useRef(0);
  const lastScrollDirectionRef = useRef<ScrollDirection>(null);
  const interactionWasOpenRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const clearTapRevealTimer = useCallback(() => {
    if (tapRevealTimerRef.current === null) return;
    window.clearTimeout(tapRevealTimerRef.current);
    tapRevealTimerRef.current = null;
  }, []);

  const clearScrollIdleTimer = useCallback(() => {
    if (scrollIdleTimerRef.current === null) return;
    window.clearTimeout(scrollIdleTimerRef.current);
    scrollIdleTimerRef.current = null;
  }, []);

  const showControlsForMoment = useCallback(() => {
    clearHideTimer();
    setControlsVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
      hideTimerRef.current = null;
    }, AUTO_HIDE_DELAY);
  }, [clearHideTimer]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const openSearch = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    clearHideTimer();
    setControlsVisible(true);
    setSearchOpen(true);
  }, [clearHideTimer]);

  const interactionOpen = open || portalOpen || searchOpen;

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  useEffect(() => {
    const updatePortalState = () => {
      const mobileControlClusters = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mobile-control-cluster]"),
      );

      setPortalOpen(
        mobileControlClusters.some((cluster) =>
          Boolean(
            cluster.querySelector(
              '[aria-expanded="true"], [data-popup-open], [data-slot="dropdown-menu-content"]',
            ),
          ),
        ),
      );
    };

    updatePortalState();

    const observer = new MutationObserver(updatePortalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-expanded", "data-popup-open"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const wasOpen = interactionWasOpenRef.current;
    interactionWasOpenRef.current = interactionOpen;

    if (interactionOpen) {
      clearHideTimer();
      setControlsVisible(true);
      return;
    }

    if (wasOpen) showControlsForMoment();
  }, [clearHideTimer, interactionOpen, showControlsForMoment]);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, searchOpen]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    const getScrollTop = () => scrollContainer?.scrollTop ?? window.scrollY;

    const handlePointerDown = (event: PointerEvent) => {
      clearTapRevealTimer();

      if (
        !event.isPrimary ||
        event.button !== 0 ||
        interactionOpen ||
        isInteractiveTapTarget(event.target)
      ) {
        tapGestureRef.current = null;
        return;
      }

      tapGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollTop: getScrollTop(),
        moved: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = tapGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const movedX = Math.abs(event.clientX - gesture.startX);
      const movedY = Math.abs(event.clientY - gesture.startY);
      if (movedX > TAP_MOVE_TOLERANCE || movedY > TAP_MOVE_TOLERANCE) {
        gesture.moved = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const gesture = tapGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      tapGestureRef.current = null;
      if (interactionOpen || isInteractiveTapTarget(event.target)) return;

      const scrollDistance = Math.abs(getScrollTop() - gesture.startScrollTop);
      if (gesture.moved || scrollDistance > 2) return;

      tapRevealTimerRef.current = window.setTimeout(() => {
        tapRevealTimerRef.current = null;
        if (hasBlockingSurface()) return;
        showControlsForMoment();
      }, 0);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (tapGestureRef.current?.pointerId === event.pointerId) {
        tapGestureRef.current = null;
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerup", handlePointerUp, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointercancel", handlePointerCancel, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
    };
  }, [clearTapRevealTimer, interactionOpen, showControlsForMoment]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scrollContainer) return;

    lastScrollTopRef.current = Math.max(0, scrollContainer.scrollTop);

    const handleScroll = () => {
      clearHideTimer();
      clearTapRevealTimer();
      clearScrollIdleTimer();

      if (tapGestureRef.current) tapGestureRef.current.moved = true;

      const nextScrollTop = Math.max(0, scrollContainer.scrollTop);
      const scrollDelta = nextScrollTop - lastScrollTopRef.current;

      if (Math.abs(scrollDelta) >= SCROLL_DIRECTION_THRESHOLD) {
        lastScrollDirectionRef.current = scrollDelta < 0 ? "up" : "down";
        lastScrollTopRef.current = nextScrollTop;
      }

      if (!interactionOpen) setControlsVisible(false);

      scrollIdleTimerRef.current = window.setTimeout(() => {
        scrollIdleTimerRef.current = null;

        if (interactionOpen || lastScrollDirectionRef.current !== "up") {
          return;
        }

        showControlsForMoment();
      }, SCROLL_IDLE_DELAY);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      clearScrollIdleTimer();
    };
  }, [
    clearHideTimer,
    clearScrollIdleTimer,
    clearTapRevealTimer,
    interactionOpen,
    showControlsForMoment,
  ]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      clearTapRevealTimer();
      clearScrollIdleTimer();
      tapGestureRef.current = null;
    };
  }, [clearHideTimer, clearScrollIdleTimer, clearTapRevealTimer]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      searchInputRef.current?.focus();
      return;
    }

    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(trimmedQuery)}`,
    );
    closeSearch();
  }

  const controlTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.36, ease: CONTROL_EASE };
  const searchTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.42, ease: SEARCH_EASE };
  const glassTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.22, ease: SEARCH_EASE };

  const expandedSearchWidth = Math.max(44, Math.min(544, viewportWidth - 32));
  const expandedSearchLeft = Math.max(
    16,
    (viewportWidth - expandedSearchWidth) / 2,
  );
  const searchMotion = searchOpen
    ? {
        left: expandedSearchLeft,
        x: 0,
        width: expandedSearchWidth,
        opacity: 1,
        scale: 1,
      }
    : controlsVisible
      ? {
          left: 68,
          x: 0,
          width: 44,
          opacity: 1,
          scale: 1,
        }
      : {
          left: -64,
          x: 0,
          width: 44,
          opacity: 0,
          scale: 0.96,
        };

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {searchOpen ? (
                <motion.button
                  key="mobile-search-glass"
                  type="button"
                  aria-label="Close transaction search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={glassTransition}
                  onClick={closeSearch}
                  className="fixed inset-0 z-30 bg-[rgb(41_86_200_/_0.07)] backdrop-blur-[4px] backdrop-saturate-105 dark:bg-[rgb(41_86_200_/_0.1)] lg:hidden"
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <motion.div
          data-mobile-control-cluster
          initial={false}
          animate={
            searchOpen
              ? { x: -88, opacity: 0, scale: 0.96 }
              : controlsVisible
                ? { x: 0, opacity: 1, scale: 1 }
                : { x: -88, opacity: 0, scale: 0.96 }
          }
          transition={controlTransition}
          aria-hidden={!controlsVisible || searchOpen}
          inert={!controlsVisible || searchOpen ? true : undefined}
          className={`fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-40 will-change-transform print:hidden lg:hidden ${
            controlsVisible && !searchOpen ? "" : "pointer-events-none"
          }`}
        >
          <SheetTrigger
            type="button"
            aria-label="Open navigation menu"
            className="finance-focus grid size-11 shrink-0 place-items-center rounded-[14px] border border-border bg-card/92 p-0 text-text-primary shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-elevated active:scale-[0.97] dark:border-border-strong/70 dark:bg-surface-elevated/92 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]"
          >
            <span
              aria-hidden="true"
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-3 rounded-full bg-current" />
            </span>
          </SheetTrigger>
        </motion.div>

        <SheetContent
          data-mobile-navigation-drawer
          side="left"
          showCloseButton={false}
          className="h-dvh max-h-dvh !w-[min(86vw,20rem)] max-w-[20rem] gap-0 overflow-hidden rounded-r-[26px] border-border/80 bg-surface-elevated/98 p-0 shadow-[24px_0_70px_rgb(15_23_42_/_0.2)] backdrop-blur-xl sm:!w-[22rem] sm:max-w-[22rem] dark:shadow-[24px_0_70px_rgb(0_0_0_/_0.48)]"
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
            aria-label="Mobile dashboard navigation"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4.5"
          >
            <div className="space-y-3.5">
              {NAV_GROUPS.map((group) => {
                const singleItem = group.items.length === 1;

                return (
                  <section
                    key={group.label}
                    aria-labelledby={`mobile-navigation-${group.label.toLowerCase()}`}
                  >
                    <div className="mb-1.5 flex items-center gap-2 px-1.5">
                      <h2
                        id={`mobile-navigation-${group.label.toLowerCase()}`}
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

      <motion.form
        data-mobile-control-cluster
        role="search"
        aria-label="Search transactions"
        onSubmit={handleSearch}
        initial={false}
        animate={searchMotion}
        transition={searchTransition}
        className={`fixed top-[max(1rem,env(safe-area-inset-top))] z-[80] flex h-11 items-center overflow-hidden rounded-[14px] border bg-card/96 shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-xl will-change-[left,width,transform,opacity] print:hidden lg:hidden dark:bg-surface-elevated/96 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)] ${
          searchOpen
            ? "border-brand/25"
            : "border-border dark:border-border-strong/70"
        } ${controlsVisible || searchOpen ? "" : "pointer-events-none"}`}
      >
        <button
          type={searchOpen ? "submit" : "button"}
          aria-label={searchOpen ? "Search transactions" : "Open transaction search"}
          aria-expanded={searchOpen}
          onClick={() => {
            if (!searchOpen) openSearch();
          }}
          className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-text-secondary outline-none transition-[background-color,color,transform] hover:bg-hover hover:text-text-primary active:scale-[0.97]"
        >
          <Search size={18} strokeWidth={2.15} aria-hidden="true" />
        </button>

        <label htmlFor="mobile-inline-transaction-search" className="sr-only">
          Search transactions
        </label>
        <input
          ref={searchInputRef}
          id="mobile-inline-transaction-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          tabIndex={searchOpen ? 0 : -1}
          aria-hidden={!searchOpen}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search transactions..."
          className={`min-w-0 flex-1 bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-tertiary transition-[opacity] duration-200 ${
            searchOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <button
          type="button"
          aria-label="Close transaction search"
          tabIndex={searchOpen ? 0 : -1}
          onClick={closeSearch}
          className={`finance-focus mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-text-secondary outline-none transition-[opacity,transform,background-color,color] duration-200 hover:bg-hover hover:text-text-primary ${
            searchOpen
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-90 opacity-0"
          }`}
        >
          <X size={16} strokeWidth={2.1} aria-hidden="true" />
        </button>
      </motion.form>

      <motion.div
        data-mobile-control-cluster
        initial={false}
        animate={
          searchOpen
            ? { x: 152, opacity: 0, scale: 0.96 }
            : controlsVisible
              ? { x: 0, opacity: 1, scale: 1 }
              : { x: 152, opacity: 0, scale: 0.96 }
        }
        transition={controlTransition}
        aria-hidden={!controlsVisible || searchOpen}
        inert={!controlsVisible || searchOpen ? true : undefined}
        className={`fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 will-change-transform print:hidden lg:hidden ${
          controlsVisible && !searchOpen ? "" : "pointer-events-none"
        }`}
      >
        <div className="[&_button]:!size-11 [&_button]:!rounded-[14px] [&_button]:!border-border [&_button]:!bg-card/92 [&_button]:!text-text-primary [&_button]:!shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] [&_button]:!backdrop-blur-md [&_button]:hover:!-translate-y-0.5 [&_button]:hover:!border-brand/30 [&_button]:hover:!bg-surface-elevated [&_button]:active:!scale-[0.97] dark:[&_button]:!border-border-strong/70 dark:[&_button]:!bg-surface-elevated/92 dark:[&_button]:!shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]">
          {notificationSlot}
        </div>
        <JamalMenu align="right" placement="bottom" variant="floating" />
      </motion.div>
    </>
  );
}
