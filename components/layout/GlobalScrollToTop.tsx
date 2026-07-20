"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

type ScrollTarget = Window | HTMLElement;

const REVEAL_AFTER_VIEWPORTS = 1.5;
const ROCKET_LAUNCH_DURATION_MS = 560;
const motionEase = [0.16, 1, 0.3, 1] as const;

function isWindowTarget(target: ScrollTarget): target is Window {
  return target === window;
}

function getScrollTop(target: ScrollTarget) {
  return isWindowTarget(target) ? window.scrollY : target.scrollTop;
}

function getViewportHeight(target: ScrollTarget) {
  return isWindowTarget(target) ? window.innerHeight : target.clientHeight;
}

function resolveScrollTarget(): ScrollTarget {
  return (
    document.querySelector<HTMLElement>("[data-dashboard-scroll]") ?? window
  );
}

export default function GlobalScrollToTop() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const launchTimeoutRef = useRef<number | null>(null);
  const launchingRef = useRef(false);
  const scrollTargetRef = useRef<ScrollTarget | null>(null);
  const [visible, setVisible] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    launchingRef.current = launching;
  }, [launching]);

  useEffect(() => {
    setVisible(false);
    setLaunching(false);
    launchingRef.current = false;

    let animationFrame = 0;
    const target = resolveScrollTarget();
    scrollTargetRef.current = target;

    const updateVisibility = () => {
      if (launchingRef.current) return;

      const revealPoint =
        getViewportHeight(target) * REVEAL_AFTER_VIEWPORTS;
      setVisible(getScrollTop(target) >= revealPoint);
    };

    const handleScrollOrResize = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateVisibility);
    };

    target.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    updateVisibility();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      target.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      scrollTargetRef.current = null;
    };
  }, [pathname]);

  useEffect(
    () => () => {
      if (launchTimeoutRef.current !== null) {
        window.clearTimeout(launchTimeoutRef.current);
      }
    },
    [],
  );

  const handleScrollToTop = useCallback(() => {
    if (launchingRef.current) return;

    const target = scrollTargetRef.current ?? resolveScrollTarget();
    launchingRef.current = true;
    setLaunching(true);

    target.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });

    launchTimeoutRef.current = window.setTimeout(
      () => {
        setVisible(false);
        setLaunching(false);
        launchingRef.current = false;
        launchTimeoutRef.current = null;
      },
      shouldReduceMotion ? 140 : ROCKET_LAUNCH_DURATION_MS,
    );
  }, [shouldReduceMotion]);

  const avoidsTransactionActions = pathname === "/dashboard/transactions";
  const positionClass = avoidsTransactionActions
    ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-24"
    : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] lg:bottom-8";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="global-scroll-to-top"
          type="button"
          aria-label="Scroll to top"
          disabled={launching}
          onClick={handleScrollToTop}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={
            launching
              ? shouldReduceMotion
                ? { opacity: 0 }
                : {
                    opacity: [1, 1, 0],
                    y: [0, -10, -180],
                    scale: [1, 1.08, 0.68],
                    filter: ["blur(0px)", "blur(0px)", "blur(2px)"],
                  }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          exit={{
            opacity: 0,
            y: -14,
            scale: 0.82,
            transition: { duration: 0.18, ease: motionEase },
          }}
          transition={
            launching
              ? {
                  duration: shouldReduceMotion
                    ? 0.14
                    : ROCKET_LAUNCH_DURATION_MS / 1000,
                  times: shouldReduceMotion ? undefined : [0, 0.18, 1],
                  ease: motionEase,
                }
              : { duration: 0.18, ease: motionEase }
          }
          whileHover={launching ? undefined : { y: -7, scale: 1.07 }}
          whileTap={launching ? undefined : { scale: 0.92 }}
          className={`fixed right-3 z-[70] grid size-11 appearance-none place-items-center border-0 !bg-transparent p-0 text-slate-700 !shadow-none outline-none transition-colors duration-200 [-webkit-tap-highlight-color:transparent] hover:!bg-transparent hover:text-slate-800 focus:!bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-active active:!bg-transparent disabled:pointer-events-none sm:right-5 lg:right-8 dark:!bg-transparent dark:text-slate-100 dark:hover:text-white ${positionClass}`}
        >
          <motion.span
            aria-hidden="true"
            animate={
              launching || shouldReduceMotion
                ? { y: 0, scale: 1, rotate: 0 }
                : {
                    y: [0, -12, 0, 0],
                    scale: [1, 1.2, 1, 1],
                    rotate: [0, -3, 3, 0],
                  }
            }
            transition={
              launching || shouldReduceMotion
                ? { duration: 0.16 }
                : {
                    duration: 1.25,
                    times: [0, 0.24, 0.48, 1],
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 0.45,
                    ease: "easeInOut",
                  }
            }
            className="grid place-items-center"
          >
            <ArrowUp
              size={36}
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
