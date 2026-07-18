"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock3,
  Info,
  Target,
  X,
} from "lucide-react";

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

const toneStyles: Record<NotificationTone, string> = {
  danger: "border-danger/25 bg-danger/10 text-danger",
  warning: "border-warning/25 bg-warning/10 text-warning",
  info: "border-info/25 bg-info/10 text-info",
};

const notificationTriggerClassName =
  "finance-control finance-focus relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:text-text-primary";

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
  const SourceIcon = alert.source === "goal" ? Target : Clock3;
  const sourceLabel = alert.source === "goal" ? "Goal" : "Payable";

  return (
    <Link
      href={alert.href}
      onClick={() => onNavigate(alert)}
      className={`finance-focus group flex min-w-0 items-center gap-2.5 rounded-[0.8rem] px-2.5 py-2.5 text-left transition-colors hover:bg-surface-soft ${
        alert.read === false ? "bg-brand/5" : ""
      }`}
      aria-label={`${alert.title}. Open ${sourceLabel.toLowerCase()}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-[0.65rem] border ${toneStyles[alert.tone]}`}
      >
        <SourceIcon size={15} strokeWidth={2.2} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[13px] font-semibold leading-[1.15rem] text-text-primary">
          {alert.title}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium leading-4 text-text-tertiary">
          <span>{sourceLabel}</span>
          <span aria-hidden="true">•</span>
          <span>{alert.urgency}</span>
          <span aria-hidden="true">•</span>
          <time dateTime={alert.dateKey}>{formatAlertDate(alert.dateKey)}</time>
        </span>
      </span>

      {alert.read === false ? (
        <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
      ) : null}
      <ChevronRight
        size={14}
        className="shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function NotificationCenterLoading() {
  return (
    <button
      type="button"
      disabled
      aria-label="Loading current alerts"
      className={`${notificationTriggerClassName} cursor-wait opacity-70`}
    >
      <Bell size={18} aria-hidden="true" />
    </button>
  );
}

export default function NotificationCenter({ state }: NotificationCenterProps) {
  const supabase = createClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const displayedCount =
    state.unreadAlertCount ?? state.totalActiveAlertCountFromCheckedRecords;
  const showCount = displayedCount !== null && displayedCount > 0;
  const badgeCount = displayedCount ?? 0;
  const triggerLabel = getNotificationTriggerLabel(state);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={notificationTriggerClassName}
      >
        <Bell size={18} aria-hidden="true" />
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
          data-slot="dropdown-menu-content"
          role="dialog"
          aria-modal="false"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.65rem)] z-[70] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1rem] border border-border bg-surface-elevated shadow-[var(--shadow-overlay)]"
        >
          <div className="flex h-11 items-center justify-between border-b border-border px-3.5">
            <h2 className="text-sm font-bold text-text-primary">Notifications</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="finance-focus grid size-8 place-items-center rounded-[0.6rem] text-text-secondary transition-colors hover:bg-surface-soft hover:text-text-primary"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {state.status === "error" ? (
            <div className="flex items-center gap-2.5 px-3.5 py-4 text-sm text-text-secondary">
              <span className="grid size-8 shrink-0 place-items-center rounded-[0.65rem] border border-danger/25 bg-danger/10 text-danger">
                <AlertTriangle size={15} aria-hidden="true" />
              </span>
              <span>Notifications unavailable</span>
            </div>
          ) : state.visibleAlerts.length === 0 ? (
            <div className="flex items-center gap-2.5 px-3.5 py-4 text-sm text-text-secondary">
              <span className="grid size-8 shrink-0 place-items-center rounded-[0.65rem] border border-border bg-surface-soft">
                <Bell size={15} aria-hidden="true" />
              </span>
              <span>No notifications</span>
            </div>
          ) : (
            <div className="max-h-[min(20rem,calc(100dvh-7rem))] overflow-y-auto overscroll-contain p-1.5">
              {state.visibleAlerts.map((alert) => (
                <NotificationSummaryRow
                  key={alert.id}
                  alert={alert}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
