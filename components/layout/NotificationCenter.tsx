"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BellRing, HandCoins, Target } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  NotificationInboxAlert,
  NotificationState,
  NotificationTone,
} from "@/lib/notifications";
import { getNotificationTriggerLabel } from "@/lib/notifications";

type NotificationCenterProps = {
  state: NotificationState;
};

type NotificationPanelContentProps = {
  state: NotificationState;
  onNavigate: (alert: NotificationInboxAlert) => void;
};

const toneStyles: Record<NotificationTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

const notificationTriggerClassName =
  "finance-control finance-focus relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] font-sans text-text-secondary outline-none transition-[transform,background-color,border-color,box-shadow,color] hover:-translate-y-0.5 hover:text-text-primary active:scale-[0.97]";
const GLASS_EASE = [0.22, 1, 0.36, 1] as const;
const MENU_ICON_STROKE_WIDTH = 2.35;

function formatAlertDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function NotificationSummaryRow({
  alert,
  onNavigate,
}: {
  alert: NotificationInboxAlert;
  onNavigate: (alert: NotificationInboxAlert) => void;
}) {
  const SourceIcon = alert.source === "goal" ? Target : HandCoins;
  const sourceLabel = alert.source === "goal" ? "Goal" : "Payable";

  return (
    <Link
      href={alert.href}
      role="menuitem"
      onClick={() => onNavigate(alert)}
      className={`finance-focus flex min-w-0 items-center gap-3 rounded-[13px] px-2.5 py-2.5 text-left transition-colors hover:bg-surface-soft ${
        alert.read === false ? "bg-brand/5" : ""
      }`}
      aria-label={`${alert.title}. Open ${sourceLabel.toLowerCase()}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center ${toneStyles[alert.tone]}`}
      >
        <SourceIcon
          size={17}
          strokeWidth={MENU_ICON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[12.5px] font-semibold leading-[1.15rem] text-text-primary">
          {alert.title}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium leading-3.5 text-text-tertiary">
          <span>{sourceLabel}</span>
          <span aria-hidden="true">•</span>
          <span>{alert.urgency}</span>
          <span aria-hidden="true">•</span>
          <time dateTime={alert.dateKey}>{formatAlertDate(alert.dateKey)}</time>
        </span>
      </span>

      {alert.read === false ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-brand"
          aria-label="Unread"
        />
      ) : null}
    </Link>
  );
}

function NotificationPanelContent({
  state,
  onNavigate,
}: NotificationPanelContentProps) {
  return (
    <>
      <div className="px-3 pb-2 pt-1.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center text-info">
            <BellRing
              size={18}
              strokeWidth={MENU_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold leading-4 text-text-primary">
              Notifications
            </span>
            <span className="mt-0.5 block text-[10px] font-medium leading-3.5 text-text-tertiary">
              Goal deadlines and payable dues
            </span>
          </span>
        </div>
      </div>

      <div className="mx-2 h-px bg-divider/70" aria-hidden="true" />

      {state.status === "error" ? (
        <div className="flex items-start gap-3 rounded-[13px] px-2.5 py-3 text-text-secondary">
          <span className="grid size-8 shrink-0 place-items-center text-danger">
            <AlertTriangle
              size={17}
              strokeWidth={MENU_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-text-primary">
              Notifications unavailable
            </span>
            <span className="mt-0.5 block text-[10px] font-medium leading-3.5 text-text-tertiary">
              Check your connection and try again.
            </span>
          </span>
        </div>
      ) : state.visibleAlerts.length === 0 ? (
        <div className="flex items-start gap-3 rounded-[13px] px-2.5 py-3 text-text-secondary">
          <span className="grid size-8 shrink-0 place-items-center text-info">
            <BellRing
              size={17}
              strokeWidth={MENU_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-text-primary">
              All caught up
            </span>
            <span className="mt-0.5 block text-[10px] font-medium leading-3.5 text-text-tertiary">
              No goal or payable alerts right now.
            </span>
          </span>
        </div>
      ) : (
        <div className="max-h-[min(17rem,calc(100dvh-7rem))] overflow-y-auto overscroll-contain px-0.5 py-1">
          {state.visibleAlerts.map((alert) => (
            <NotificationSummaryRow
              key={alert.id}
              alert={alert}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function NotificationCenterLoading() {
  return (
    <button
      data-notification-trigger
      type="button"
      disabled
      aria-label="Loading current alerts"
      className={`${notificationTriggerClassName} cursor-wait opacity-70`}
    >
      <BellRing
        size={19}
        strokeWidth={MENU_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      />
    </button>
  );
}

export default function NotificationCenter({ state }: NotificationCenterProps) {
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const displayedCount =
    state.unreadAlertCount ?? state.totalActiveAlertCountFromCheckedRecords;
  const showCount = displayedCount !== null && displayedCount > 0;
  const badgeCount = displayedCount ?? 0;
  const triggerLabel = getNotificationTriggerLabel(state);
  const glassTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.24, ease: GLASS_EASE };
  const panelTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.22, ease: GLASS_EASE };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !mobilePanelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function markAlertRead(alert: NotificationInboxAlert) {
    if (state.persistenceStatus !== "ready" || alert.read !== false) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notification_states").upsert(
      {
        user_id: user.id,
        notification_id: alert.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,notification_id" },
    );
  }

  function handleNavigate(alert: NotificationInboxAlert) {
    setOpen(false);
    void markAlertRead(alert);
  }

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(
            <>
              <AnimatePresence>
                {open ? (
                  <motion.div
                    key="mobile-notification-glass"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={glassTransition}
                    onPointerDown={() => setOpen(false)}
                    className="fixed inset-0 z-30 bg-[rgb(41_86_200_/_0.07)] backdrop-blur-[4px] backdrop-saturate-105 dark:bg-[rgb(41_86_200_/_0.1)] lg:hidden"
                  />
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {open ? (
                  <motion.div
                    ref={mobilePanelRef}
                    key="mobile-notification-panel"
                    data-notification-panel
                    data-slot="dropdown-menu-content"
                    role="menu"
                    aria-label="Notifications"
                    initial={{ opacity: 0, y: -6, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.985 }}
                    transition={panelTransition}
                    className="fixed right-4 z-[70] w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[18px] border border-border/80 bg-surface-elevated/98 p-2 font-sans shadow-[0_18px_44px_rgb(15_23_42_/_0.18)] backdrop-blur-xl dark:shadow-[0_18px_48px_rgb(0_0_0_/_0.36)] sm:w-[18rem] lg:hidden"
                    style={{
                      top: "calc(max(1rem, env(safe-area-inset-top)) + 3.25rem)",
                    }}
                  >
                    <NotificationPanelContent
                      state={state}
                      onNavigate={handleNavigate}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>,
            document.body,
          )
        : null}

      <div ref={rootRef} className="relative z-[80]">
        <button
          data-notification-trigger
          type="button"
          aria-label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={notificationTriggerClassName}
        >
          <BellRing
            size={19}
            strokeWidth={MENU_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
          {showCount ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-surface-primary bg-brand px-1 text-[10px] font-bold leading-none text-primary-foreground"
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            data-notification-panel
            data-slot="dropdown-menu-content"
            role="menu"
            aria-label="Notifications"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] hidden w-[17rem] max-w-[calc(100vw-4rem)] overflow-hidden rounded-[18px] border border-border/70 bg-surface-elevated/98 p-2 font-sans shadow-[0_14px_36px_rgb(15_23_42_/_0.16)] backdrop-blur-xl dark:shadow-[0_16px_40px_rgb(0_0_0_/_0.34)] lg:block"
          >
            <NotificationPanelContent
              state={state}
              onNavigate={handleNavigate}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
