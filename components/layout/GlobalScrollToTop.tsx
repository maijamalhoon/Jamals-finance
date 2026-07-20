"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import {
  getAnimationDurationScale,
  getDocumentAnimationMode,
  scaleAnimationMilliseconds,
  scaleAnimationSeconds,
} from "@/lib/animation-preference";

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
  const animationMode = getDocumentAnimationMode();
  const motionDisabled = shouldReduceMotion || animationMode === "none";
  const durationScale = getAnimationDurationScale(animationMode);
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

    if (motionDisabled) {
      target.scrollTo({ top: 0, behavior: "auto" });
      setVisible(false);
      setLaunching(false);
      launchingRef.current = false;
      return;
    }

    launchingRef.current = true;
    setLaunching(true);

    target.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    launchTimeoutRef.current = window.setTimeout(
      () => {
        setVisible(false);
        setLaunching(false);
        launchingRef.current = false;
        launchTimeoutRef.current = null;
      },
      scaleAnimationMilliseconds(ROCKET_LAUNCH_DURATION_MS, animationMode),
    );
  }, [animationMode, motionDisabled]);

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
              ? motionDisabled
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
            y: motionDisabled ? 0 : -14,
            scale: motionDisabled ? 1 : 0.82,
            transition: {
              duration: scaleAnimationSeconds(0.18, animationMode),
              ease: motionEase,
            },
          }}
          transition={
            launching
              ? {
                  duration: motionDisabled
                    ? 0
                    : scaleAnimationSeconds(
                        ROCKET_LAUNCH_DURATION_MS / 1000,
                        animationMode,
                      ),
                  times: motionDisabled ? undefined : [0, 0.18, 1],
                  ease: motionEase,
                }
              : {
                  duration: scaleAnimationSeconds(0.18, animationMode),
                  ease: motionEase,
                }
          }
          whileHover={
            launching || motionDisabled ? undefined : { y: -7, scale: 1.07 }
          }
          whileTap={
            launching || motionDisabled ? undefined : { scale: 0.92 }
          }
          className={`fixed right-3 z-[70] grid size-11 appearance-none place-items-center border-0 !bg-transparent p-0 text-slate-700 !shadow-none outline-none transition-colors duration-200 [-webkit-tap-highlight-color:transparent] hover:!bg-transparent hover:text-slate-800 focus:!bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-active active:!bg-transparent disabled:pointer-events-none sm:right-5 lg:right-8 dark:!bg-transparent dark:text-slate-100 dark:hover:text-white ${positionClass}`}
        >
          <motion.span
            aria-hidden="true"
            animate={
              launching || motionDisabled
                ? { y: 0, scale: 1, rotate: 0 }
                : {
                    y: [0, -12, 0, 0],
                    scale: [1, 1.2, 1, 1],
                    rotate: [0, -3, 3, 0],
                  }
            }
            transition={
              launching || motionDisabled
                ? { duration: 0 }
                : {
                    duration: 1.25 * durationScale,
                    times: [0, 0.24, 0.48, 1],
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 0.45 * durationScale,
                    ease: "easeInOut",
                  }
            }
            className="grid place-items-center"
          >
            <ArrowUp
              key="scroll-arrow-weight-4"
              size={36}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeWidth: 4 }}
            />
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
