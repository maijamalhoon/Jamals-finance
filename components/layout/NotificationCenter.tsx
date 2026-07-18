"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock3,
  Info,
  RefreshCw,
  Settings,
  Target,
  Timer,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type {
  NotificationInboxAlert,
  NotificationSource,
  NotificationState,
  NotificationTone,
} from "@/lib/notifications";
import {
  addDaysToDateKey,
  getNotificationSummary,
  getNotificationTriggerLabel,
} from "@/lib/notifications";
import { getAppDateKey } from "@/lib/dates";

type NotificationCenterProps = {
  state: NotificationState;
};

const toneStyles: Record<
  NotificationTone,
  { icon: typeof AlertTriangle; className: string }
> = {
  danger: {
    icon: AlertTriangle,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
  warning: {
    icon: Clock3,
    className: "border-warning/25 bg-warning/10 text-warning",
  },
  info: {
    icon: Info,
    className: "border-info/25 bg-info/10 text-info",
  },
};

const notificationTriggerClassName =
  "finance-control finance-focus relative grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:text-text-primary";

function formatAlertDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatUnavailableSources(sources: NotificationSource[]) {
  return sources
    .map((source) => (source === "goal" ? "goals" : "payables"))
    .join(" and ");
}

function AlertRow({
  alert,
  onNavigate,
  onMarkRead,
  onSnooze,
  onDismiss,
  pending,
  persistenceAvailable,
}: {
  alert: NotificationInboxAlert;
  onNavigate: (alert: NotificationInboxAlert) => void;
  onMarkRead: (alert: NotificationInboxAlert) => void;
  onSnooze: (alert: NotificationInboxAlert) => void;
  onDismiss: (alert: NotificationInboxAlert) => void;
  pending: boolean;
  persistenceAvailable: boolean;
}) {
  const tone = toneStyles[alert.tone];
  const Icon = tone.icon;
  const SourceIcon = alert.source === "goal" ? Target : Clock3;

  return (
    <article
      className={`rounded-[1.125rem] border bg-surface-primary p-3 shadow-theme transition-colors sm:p-3.5 ${
        alert.read === false ? "border-brand/35" : "border-border"
      }`}
    >
      <Link
        href={alert.href}
        onClick={() => onNavigate(alert)}
        className="finance-focus group flex min-h-11 min-w-0 gap-2.5 rounded-[calc(var(--radius-tile)-0.35rem)] text-left hover:bg-surface-soft sm:gap-3"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control)] border sm:h-10 sm:w-10 ${tone.className}`}
        >
          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {alert.read === false ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                Unread
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${tone.className}`}
            >
              <Icon size={10} aria-hidden="true" />
              {alert.urgency}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-tertiary">
              <SourceIcon size={11} aria-hidden="true" />
              {alert.source === "goal" ? "Goal" : "Payable"}
            </span>
          </span>
          <span className="mt-2 block break-words text-[13px] font-bold leading-5 text-text-primary sm:text-sm">
            {alert.title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-text-secondary">
            {alert.description}
          </span>
          <span className="mt-2 block text-[11px] font-semibold text-text-tertiary">
            Deadline: <time dateTime={alert.dateKey}>{formatAlertDate(alert.dateKey)}</time>
          </span>
        </span>
      </Link>

      {persistenceAvailable ? (
        <div className="mt-3 flex flex-wrap justify-start gap-1.5 border-t border-border pt-2.5 sm:justify-end">
          {alert.read === false ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onMarkRead(alert)}
              className="min-h-10 flex-1 px-2 text-xs sm:flex-none sm:px-3"
            >
              <Check aria-hidden="true" size={14} />
              Mark read
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onSnooze(alert)}
            className="min-h-10 flex-1 px-2 text-xs sm:flex-none sm:px-3"
          >
            <Timer aria-hidden="true" size={14} />
            Snooze 1 day
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onDismiss(alert)}
            className="min-h-10 flex-1 px-2 text-xs text-danger hover:text-danger sm:flex-none sm:px-3"
          >
            <BellOff aria-hidden="true" size={14} />
            Dismiss
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function groupAlerts(alerts: NotificationInboxAlert[]) {
  const today = getAppDateKey();
  const weekEnd = addDaysToDateKey(today, 7) ?? today;
  const groups = [
    { label: "Today", alerts: alerts.filter((alert) => alert.dateKey === today) },
    {
      label: "This Week",
      alerts: alerts.filter(
        (alert) => alert.dateKey > today && alert.dateKey <= weekEnd,
      ),
    },
    {
      label: "Earlier",
      alerts: alerts.filter(
        (alert) => alert.dateKey < today || alert.dateKey > weekEnd,
      ),
    },
  ];

  return groups.filter((group) => group.alerts.length > 0);
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
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, startRefresh] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineState = () => setOnline(navigator.onLine);
    updateOnlineState();

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const displayedCount = state.unreadAlertCount ?? state.totalActiveAlertCountFromCheckedRecords;
  const showCount = displayedCount !== null && displayedCount > 0;
  const badgeCount = displayedCount ?? 0;
  const triggerLabel = getNotificationTriggerLabel(state);
  const alertGroups = groupAlerts(state.visibleAlerts);
  const notificationSummary =
    state.status === "ready" && state.visibleAlerts.length === 0
      ? "All caught up"
      : getNotificationSummary(state);

  async function persistAlertState(
    notificationId: string,
    values: {
      read_at?: string;
      dismissed_at?: string;
      snoozed_until?: string;
    },
    successMessage?: string,
  ) {
    if (state.persistenceStatus !== "ready" || actionId) return false;
    setActionId(notificationId);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Your session expired. Sign in again.");
      setActionId(null);
      return false;
    }

    const { error } = await supabase.from("notification_states").upsert(
      {
        user_id: user.id,
        notification_id: notificationId,
        ...values,
      },
      { onConflict: "user_id,notification_id" },
    );

    setActionId(null);
    if (error) {
      toast.error(
        getUserMutationError(error, "Notification could not be updated. Try again."),
      );
      return false;
    }

    if (successMessage) toast.success(successMessage);
    startRefresh(() => router.refresh());
    return true;
  }

  function markRead(alert: NotificationInboxAlert) {
    void persistAlertState(alert.id, { read_at: new Date().toISOString() });
  }

  function snooze(alert: NotificationInboxAlert) {
    const now = new Date();
    void persistAlertState(
      alert.id,
      {
        read_at: now.toISOString(),
        snoozed_until: new Date(now.getTime() + 86_400_000).toISOString(),
      },
      "Alert snoozed for one day.",
    );
  }

  function dismiss(alert: NotificationInboxAlert) {
    const now = new Date().toISOString();
    void persistAlertState(
      alert.id,
      { read_at: now, dismissed_at: now },
      "Alert dismissed.",
    );
  }

  async function markAllRead() {
    if (
      state.persistenceStatus !== "ready" ||
      state.activeAlertIds.length === 0 ||
      actionId
    ) {
      return;
    }
    setActionId("all");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error("Your session expired. Sign in again.");
      setActionId(null);
      return;
    }

    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notification_states").upsert(
      state.activeAlertIds.map((notificationId) => ({
        user_id: user.id,
        notification_id: notificationId,
        read_at: readAt,
      })),
      { onConflict: "user_id,notification_id" },
    );

    setActionId(null);
    if (error) {
      toast.error(
        getUserMutationError(error, "Notifications could not be updated. Try again."),
      );
      return;
    }

    toast.success("All alerts marked as read.");
    startRefresh(() => router.refresh());
  }

  function retry() {
    if (!online || refreshing) return;
    startRefresh(() => router.refresh());
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        type="button"
        aria-label={triggerLabel}
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
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-[100dvh] max-h-[100dvh] w-full max-w-none gap-0 overflow-hidden border-l-0 border-border bg-surface-elevated p-0 sm:w-[26rem] sm:max-w-[calc(100vw-1rem)] sm:rounded-l-[1.25rem] sm:border-l lg:w-[28rem] lg:max-w-[28rem]"
      >
        <SheetHeader className="shrink-0 border-b border-border bg-surface-elevated px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-4 sm:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary text-text-primary shadow-theme">
                <Bell size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[1.05rem] font-bold leading-6 text-text-primary sm:text-lg">
                  Notifications
                </SheetTitle>
                <SheetDescription className="mt-0.5 line-clamp-1 text-xs leading-5 text-text-secondary sm:text-sm">
                  Goal and payable alerts in one place.
                </SheetDescription>
              </div>
            </div>
            <SheetClose
              className="finance-focus grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary text-text-secondary shadow-theme transition-colors hover:bg-hover hover:text-text-primary"
              aria-label="Close notification center"
            >
              <X size={18} aria-hidden="true" />
            </SheetClose>
          </div>

          <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-text-secondary sm:text-sm">
                {notificationSummary}
              </p>
              <BackgroundRefreshStatus
                refreshing={refreshing}
                label="Refreshing alerts…"
                className="mt-1"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {state.persistenceStatus === "ready" && (state.unreadAlertCount ?? 0) > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void markAllRead()}
                  disabled={Boolean(actionId)}
                  aria-label="Mark all alerts as read"
                  title="Mark all as read"
                  className="size-10 rounded-[var(--radius-control)] border border-border bg-surface-primary shadow-theme"
                >
                  <CheckCheck aria-hidden="true" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={retry}
                loading={refreshing}
                disabled={!online}
                aria-label="Refresh current alerts"
                title="Refresh current alerts"
                className="size-10 rounded-[var(--radius-control)] border border-border bg-surface-primary shadow-theme"
              >
                <RefreshCw aria-hidden="true" />
              </Button>
              <Link
                href="/dashboard/settings#notifications"
                onClick={() => setOpen(false)}
                aria-label="Open notification preferences"
                title="Notification preferences"
                className="finance-focus grid size-10 place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary text-text-secondary shadow-theme transition-colors hover:bg-primary-soft hover:text-text-primary"
              >
                <Settings aria-hidden="true" size={16} />
              </Link>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
          {!online ? (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-[var(--radius-tile)] border border-warning/25 bg-warning/10 p-3 text-warning"
            >
              <WifiOff className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              <p className="text-xs leading-5">
                You are offline. Previously loaded alerts remain visible, but refresh is unavailable.
              </p>
            </div>
          ) : null}

          {state.status === "partial" ? (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-[var(--radius-tile)] border border-warning/25 bg-warning/10 p-3 text-warning"
            >
              <AlertTriangle
                className="mt-0.5 shrink-0"
                size={16}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">Partial alert data</p>
                <p className="mt-0.5 text-xs leading-5">
                  {formatUnavailableSources(state.unavailableSources)} could not be checked. Available alerts are still shown.
                </p>
              </div>
            </div>
          ) : null}

          {state.persistenceStatus === "error" ? (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-[var(--radius-tile)] border border-warning/25 bg-warning/10 p-3 text-warning"
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
              <p className="text-xs leading-5">
                Read, snooze, and dismiss state could not be loaded. Alerts remain view-only until refresh succeeds.
              </p>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="mx-auto flex min-h-[20rem] w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <span className="grid size-14 place-items-center rounded-full border border-danger/25 bg-danger/10 text-danger">
                <AlertTriangle size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-text-primary">
                Alerts are unavailable
              </h3>
              <p className="mt-2 max-w-[18rem] text-sm leading-6 text-text-secondary">
                Goals and payables could not be checked. Retry when your connection is available.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={retry}
                disabled={!online}
                loading={refreshing}
                loadingLabel="Retrying…"
                className="mt-5 min-h-11"
              >
                <RefreshCw size={15} aria-hidden="true" />
                {online ? "Retry" : "Reconnect to retry"}
              </Button>
            </div>
          ) : state.visibleAlerts.length === 0 ? (
            <div className="mx-auto flex min-h-[20rem] w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-8 text-center">
              <span className="grid size-14 place-items-center rounded-full border border-border bg-surface-soft text-text-secondary">
                <Bell size={22} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-text-primary">
                {state.status === "partial"
                  ? "No alerts in available data"
                  : "No current alerts"}
              </h3>
              <p className="mt-2 max-w-[18rem] text-sm leading-6 text-text-secondary">
                {state.status === "partial"
                  ? `The available source has no current alerts. ${formatUnavailableSources(state.unavailableSources)} could not be checked.`
                  : "Nothing in your goals or payables needs near-term attention."}
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-1" aria-label="Current active alerts">
              {alertGroups.map((group) => (
                <section key={group.label} aria-labelledby={`notification-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}>
                  <h3
                    id={`notification-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}
                    className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary"
                  >
                    {group.label}
                  </h3>
                  <div className="space-y-3">
                    {group.alerts.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        onNavigate={(selectedAlert) => {
                          if (selectedAlert.read === false) markRead(selectedAlert);
                          setOpen(false);
                        }}
                        onMarkRead={markRead}
                        onSnooze={snooze}
                        onDismiss={dismiss}
                        pending={actionId === alert.id || actionId === "all"}
                        persistenceAvailable={state.persistenceStatus === "ready"}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
