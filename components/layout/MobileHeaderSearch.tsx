"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal, flushSync } from "react-dom";

const SEARCH_EASE = [0.16, 1, 0.3, 1] as const;
const AUTO_CLOSE_DELAY_MS = 6_000;

type MobileHeaderSearchProps = {
  controlsVisible: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function MobileHeaderSearch({
  controlsVisible,
  open,
  onOpenChange,
}: MobileHeaderSearchProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const openingPointerRef = useRef<number | null>(null);
  const backdropFrameRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [viewportWidth, setViewportWidth] = useState(390);
  const [backdropReady, setBackdropReady] = useState(false);

  const cancelBackdropFrame = useCallback(() => {
    if (backdropFrameRef.current === null) return;
    window.cancelAnimationFrame(backdropFrameRef.current);
    backdropFrameRef.current = null;
  }, []);

  const cancelAutoClose = useCallback(() => {
    if (autoCloseTimerRef.current === null) return;
    window.clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = null;
  }, []);

  const focusInput = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus({ preventScroll: true });
    const caretPosition = input.value.length;
    input.setSelectionRange(caretPosition, caretPosition);
  }, []);

  const armBackdrop = useCallback(() => {
    cancelBackdropFrame();
    backdropFrameRef.current = window.requestAnimationFrame(() => {
      backdropFrameRef.current = null;
      setBackdropReady(true);
    });
  }, [cancelBackdropFrame]);

  const closeSearch = useCallback(() => {
    cancelBackdropFrame();
    cancelAutoClose();
    openingPointerRef.current = null;
    inputRef.current?.blur();
    setBackdropReady(false);
    setQuery("");
    onOpenChange(false);
  }, [cancelAutoClose, cancelBackdropFrame, onOpenChange]);

  const scheduleAutoClose = useCallback(() => {
    cancelAutoClose();
    if (!open || query.trim()) return;

    autoCloseTimerRef.current = window.setTimeout(() => {
      autoCloseTimerRef.current = null;
      if (!inputRef.current?.value.trim()) closeSearch();
    }, AUTO_CLOSE_DELAY_MS);
  }, [cancelAutoClose, closeSearch, open, query]);

  const openSearch = useCallback(() => {
    if (open) return;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    setBackdropReady(false);
    flushSync(() => onOpenChange(true));
    focusInput();
    queueMicrotask(focusInput);
  }, [focusInput, onOpenChange, open]);

  const handleOpenPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (open || !event.isPrimary || event.button !== 0) return;

    event.preventDefault();
    openingPointerRef.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; the guarded backdrop remains safe.
    }

    openSearch();
  };

  const finishOpeningPointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (openingPointerRef.current !== event.pointerId) return;

    openingPointerRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Older mobile engines can omit pointer-capture inspection.
    }

    armBackdrop();
  };

  const handleOpenClick = () => {
    // Keyboard activation does not produce a pointer sequence.
    if (!open) {
      openSearch();
      armBackdrop();
    }
  };

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  useEffect(() => {
    if (!open) {
      setBackdropReady(false);
      cancelAutoClose();
      return;
    }

    const focusFrame = window.requestAnimationFrame(focusInput);
    if (openingPointerRef.current === null) armBackdrop();
    scheduleAutoClose();

    return () => window.cancelAnimationFrame(focusFrame);
  }, [armBackdrop, cancelAutoClose, focusInput, open, scheduleAutoClose]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch, open]);

  useEffect(() => {
    return () => {
      cancelBackdropFrame();
      cancelAutoClose();
    };
  }, [cancelAutoClose, cancelBackdropFrame]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      focusInput();
      scheduleAutoClose();
      return;
    }

    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(trimmedQuery)}`,
    );
    closeSearch();
  };

  const searchTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.42, ease: SEARCH_EASE };
  const glassTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.22, ease: SEARCH_EASE };

  const expandedWidth = Math.max(44, Math.min(544, viewportWidth - 32));
  const expandedLeft = Math.max(16, (viewportWidth - expandedWidth) / 2);
  const searchMotion = open
    ? {
        left: expandedLeft,
        x: 0,
        width: expandedWidth,
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
              {open ? (
                <motion.button
                  key="mobile-search-glass"
                  type="button"
                  aria-label="Close transaction search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={glassTransition}
                  onClick={() => {
                    if (backdropReady) closeSearch();
                  }}
                  className={`fixed inset-0 z-30 bg-[rgb(41_86_200_/_0.07)] backdrop-blur-[4px] backdrop-saturate-105 dark:bg-[rgb(41_86_200_/_0.1)] lg:hidden ${
                    backdropReady ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <motion.form
        data-mobile-control-cluster
        role="search"
        aria-label="Search transactions"
        onSubmit={handleSubmit}
        initial={false}
        animate={searchMotion}
        transition={searchTransition}
        className={`fixed top-[max(1rem,env(safe-area-inset-top))] z-[80] flex h-11 items-center overflow-hidden rounded-[14px] border bg-card/96 shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-xl will-change-[left,width,transform,opacity] print:hidden lg:hidden dark:bg-surface-elevated/96 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)] ${
          open ? "border-brand/25" : "border-border dark:border-border-strong/70"
        } ${controlsVisible || open ? "" : "pointer-events-none"}`}
      >
        <button
          type={open ? "submit" : "button"}
          aria-label={open ? "Search transactions" : "Open transaction search"}
          aria-expanded={open}
          onPointerDown={handleOpenPointerDown}
          onPointerUp={finishOpeningPointer}
          onPointerCancel={finishOpeningPointer}
          onClick={handleOpenClick}
          className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-text-secondary outline-none transition-[background-color,color,transform] hover:bg-hover hover:text-text-primary active:scale-[0.97]"
        >
          <Search size={18} strokeWidth={2.15} aria-hidden="true" />
        </button>

        <label htmlFor="mobile-inline-transaction-search" className="sr-only">
          Search transactions
        </label>
        <input
          ref={inputRef}
          id="mobile-inline-transaction-search"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          value={query}
          onFocus={scheduleAutoClose}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search transactions..."
          className={`min-w-0 flex-1 bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-tertiary transition-[opacity] duration-200 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <button
          type="button"
          aria-label="Close transaction search"
          tabIndex={open ? 0 : -1}
          onClick={closeSearch}
          className={`finance-focus mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-text-secondary outline-none transition-[opacity,transform,background-color,color] duration-200 hover:bg-hover hover:text-text-primary ${
            open
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-90 opacity-0"
          }`}
        >
          <X size={16} strokeWidth={2.1} aria-hidden="true" />
        </button>
      </motion.form>
    </>
  );
}
