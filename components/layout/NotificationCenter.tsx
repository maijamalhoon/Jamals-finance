"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Bell,
  BellOff,
  HandCoins,
  Target,
} from "lucide-react";

import {
  announceHeaderPopoverOpen,
  getHeaderPopoverSource,
  HEADER_POPOVER_OPEN_EVENT,
} from "@/lib/header-popovers";
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
  onNavigate: (alert: NotificationInboxAlert) => Promise<void>;
};

const toneStyles: Record<NotificationTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

const notificationTriggerClassName =
  "finance-focus relative grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent p-0 font-sans text-text-secondary shadow-none outline-none transition-[transform,color,opacity] hover:-translate-y-0.5 hover:text-text-primary active:scale-[0.96]";
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
  onNavigate: (alert: NotificationInboxAlert) => Promise<void>;
}) {
  const SourceIcon = alert.source === "goal" ? Target : HandCoins;
  const sourceLabel = alert.source === "goal" ? "Goal" : "Payable";

  return (
    <Link
      href={alert.href}
      role="menuitem"
      onClick={(event) => {
        event.preventDefault();
        void onNavigate(alert);
      }}
      className="finance-focus group flex min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-soft/80"
      aria-label={`${alert.title}. Open ${sourceLabel.toLowerCase()}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center ${toneStyles[alert.tone]}`}
      >
        <SourceIcon
          size={18}
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
          className="size-1.5 shrink-0 rounded-full bg-brand transition-transform group-hover:scale-125"
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
  const unreadCount = state.unreadAlertCount;

  return (
    <>
      <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-2">
        <span className="grid size-8 shrink-0 place-items-center text-info">
          <Bell
            size={18}
            strokeWidth={MENU_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold leading-4 text-text-primary">
            Notifications
          </span>
          <span className="mt-0.5 block text-[10px] font-medium leading-3.5 text-text-tertiary">
            Goal deadlines and payable dues
          </span>
        </span>
        {unreadCount !== null && unreadCount > 0 ? (
          <span className="inline-flex min-h-6 items-center rounded-full bg-brand/10 px-2 text-[10px] font-bold text-brand">
            {unreadCount} unread
          </span>
        ) : null}
      </div>

      <div className="mx-2 h-px bg-divider/70" aria-hidden="true" />

      {state.status === "error" ? (
        <div className="flex items-start gap-3 px-3 py-3.5 text-text-secondary">
          <span className="grid size-8 shrink-0 place-items-center text-danger">
            <AlertTriangle
              size={18}
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
        <div className="flex items-start gap-3 px-3 py-3.5 text-text-secondary">
          <span className="grid size-8 shrink-0 place-items-center text-info">
            <BellOff
              size={18}
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
        <div className="max-h-[min(22rem,calc(100dvh-7rem))] divide-y divide-divider/60 overflow-y-auto overscroll-contain py-0.5">
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
      <Bell
        size={19}
        strokeWidth={2.55}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      />
    </button>
  );
}

export default function NotificationCenter({ state }: NotificationCenterProps) {
  const router = useRouter();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [localState, setLocalState] = useState(state);

  useEffect(() => {
    setLocalState(state);
  }, [state]);

  useEffect(() => {
    function handleOtherHeaderPopover(event: Event) {
      const source = getHeaderPopoverSource(event);
      if (source && source !== "notifications") setOpen(false);
    }

    window.addEventListener(
      HEADER_POPOVER_OPEN_EVENT,
      handleOtherHeaderPopover,
    );
    return () =>
      window.removeEventListener(
        HEADER_POPOVER_OPEN_EVENT,
        handleOtherHeaderPopover,
      );
  }, []);

  const displayedCount =
    localState.unreadAlertCount ??
    localState.totalActiveAlertCountFromCheckedRecords;
  const showCount = displayedCount !== null && displayedCount > 0;
  const triggerLabel = getNotificationTriggerLabel(localState);
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

  function setLocalAlertRead(alertId: string, read: boolean) {
    setLocalState((current) => {
      const target = current.visibleAlerts.find((alert) => alert.id === alertId);
      if (!target || target.read === read) return current;

      const unreadDelta = read ? -1 : 1;
      return {
        ...current,
        visibleAlerts: current.visibleAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, read } : alert,
        ),
        unreadAlertCount:
          current.unreadAlertCount === null
            ? null
            : Math.max(0, current.unreadAlertCount + unreadDelta),
      };
    });
  }

  async function persistAlertRead(alert: NotificationInboxAlert) {
    if (localState.persistenceStatus !== "ready" || alert.read !== false) {
      return true;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("notification_states").upsert(
      {
        user_id: user.id,
        notification_id: alert.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,notification_id" },
    );

    return !error;
  }

  async function handleNavigate(alert: NotificationInboxAlert) {
    const wasUnread = alert.read === false;
    setOpen(false);

    if (wasUnread) setLocalAlertRead(alert.id, true);

    const persisted = await persistAlertRead(alert);
    if (!persisted && wasUnread) setLocalAlertRead(alert.id, false);

    router.push(alert.href);
  }

  function handleTriggerClick() {
    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) announceHeaderPopoverOpen("notifications");
      return nextOpen;
    });
  }

  return (
    <>
      {typeof document !== "undefined"
        ? createPortal(
            <>
              <AnimatePresence>
                {open ? (
                  <motion.div
                    key="notification-glass"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={glassTransition}
                    onPointerDown={() => setOpen(false)}
                    className="fixed inset-0 z-20 bg-transparent"
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
                    className="fixed right-4 z-[70] w-[18rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-[18px] border border-border/65 bg-surface-elevated/98 p-1.5 font-sans shadow-[0_18px_44px_rgb(15_23_42_/_0.16)] backdrop-blur-xl dark:shadow-[0_18px_48px_rgb(0_0_0_/_0.32)] sm:w-[19rem] lg:hidden"
                    style={{
                      top: "calc(max(1rem, env(safe-area-inset-top)) + 3.25rem)",
                    }}
                  >
                    <NotificationPanelContent
                      state={localState}
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
          onClick={handleTriggerClick}
          className={notificationTriggerClassName}
        >
          <Bell
            size={19}
            strokeWidth={2.55}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          />
          {showCount ? (
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={
                reduceMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: [1, 0.42, 1], scale: [1, 0.9, 1] }
              }
              transition={
                reduceMotion
                  ? { duration: 0.01 }
                  : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
              }
              className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-red-700 dark:bg-red-400"
            />
          ) : null}
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              key="desktop-notification-panel"
              data-notification-panel
              data-slot="dropdown-menu-content"
              role="menu"
              aria-label="Notifications"
              initial={{ opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.985 }}
              transition={panelTransition}
              className="absolute right-0 top-[calc(100%+0.45rem)] z-[70] hidden w-[18rem] max-w-[calc(100vw-4rem)] origin-top-right overflow-hidden rounded-[18px] border border-border/60 bg-surface-elevated/98 p-1.5 font-sans shadow-[0_14px_36px_rgb(15_23_42_/_0.14)] backdrop-blur-xl dark:shadow-[0_16px_40px_rgb(0_0_0_/_0.3)] lg:block"
            >
              <NotificationPanelContent
                state={localState}
                onNavigate={handleNavigate}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
