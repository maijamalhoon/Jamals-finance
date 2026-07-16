"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Bell,
  Clock3,
  Info,
  RefreshCw,
  Target,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";
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
  NotificationAlert,
  NotificationSource,
  NotificationState,
  NotificationTone,
} from "@/lib/notifications";
import {
  getNotificationSummary,
  getNotificationTriggerLabel,
} from "@/lib/notifications";

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
}: {
  alert: NotificationAlert;
  onNavigate: () => void;
}) {
  const tone = toneStyles[alert.tone];
  const Icon = tone.icon;
  const SourceIcon = alert.source === "goal" ? Target : Clock3;

  return (
    <Link
      href={alert.href}
      onClick={onNavigate}
      className="finance-focus group flex min-h-11 min-w-0 gap-3 rounded-[var(--radius-tile)] border border-border bg-surface-primary p-3.5 text-left shadow-theme transition-colors hover:border-border-strong hover:bg-surface-soft"
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] border ${tone.className}`}
      >
        <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
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
        <span className="mt-2 block break-words text-sm font-bold leading-5 text-text-primary">
          {alert.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-text-secondary">
          {alert.description}
        </span>
        <span className="mt-2 block text-[11px] font-semibold text-text-tertiary">
          <time dateTime={alert.dateKey}>{formatAlertDate(alert.dateKey)}</time>
        </span>
      </span>
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [refreshing, startRefresh] = useTransition();

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

  const totalActiveAlertCount =
    state.totalActiveAlertCountFromCheckedRecords;
  const showCount = totalActiveAlertCount !== null && totalActiveAlertCount > 0;
  const triggerLabel = getNotificationTriggerLabel(state);

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
            {totalActiveAlertCount > 9 ? "9+" : totalActiveAlertCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-dvh max-h-dvh w-[min(100vw,26rem)] max-w-full gap-0 overflow-hidden border-border bg-surface-elevated p-0 sm:w-[26rem] sm:max-w-[26rem]"
      >
        <SheetHeader className="border-b border-border px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-start justify-between gap-3 pr-0">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-text-primary">
                Notification center
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-5 text-text-secondary">
                Current alerts from your goals and payables.
              </SheetDescription>
            </div>
            <SheetClose
              className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:bg-hover hover:text-text-primary"
              aria-label="Close notification center"
            >
              <X size={18} aria-hidden="true" />
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border bg-surface-primary px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">
              {getNotificationSummary(state)}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {state.status === "error"
                ? "Goals and payables could not be checked."
                : state.status === "partial"
                  ? "One alert source could not be checked; the count uses available checked records."
                  : "The count reflects the bounded records checked for current deadlines."}
            </p>
            <BackgroundRefreshStatus
              refreshing={refreshing}
              label="Refreshing alerts…"
              className="mt-1.5"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={retry}
            loading={refreshing}
            disabled={!online}
            aria-label="Refresh current alerts"
            title="Refresh current alerts"
          >
            <RefreshCw aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
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

          {state.status === "error" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-tile)] border border-danger/25 bg-danger/10 text-danger">
                <AlertTriangle size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-text-primary">
                Alerts are unavailable
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">
                Goals and payables could not be checked. Retry when your connection is available.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={retry}
                disabled={!online}
                loading={refreshing}
                loadingLabel="Retrying…"
                className="mt-4 min-h-11"
              >
                <RefreshCw size={15} aria-hidden="true" />
                {online ? "Retry" : "Reconnect to retry"}
              </Button>
            </div>
          ) : state.visibleAlerts.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-tile)] border border-border bg-surface-soft text-text-secondary">
                <Bell size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-text-primary">
                {state.status === "partial"
                  ? "No alerts in available data"
                  : "No current alerts"}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-text-secondary">
                {state.status === "partial"
                  ? `The available source has no current alerts. ${formatUnavailableSources(state.unavailableSources)} could not be checked.`
                  : "Nothing in your goals or payables needs near-term attention."}
              </p>
            </div>
          ) : (
            <div className="space-y-3" aria-label="Current active alerts">
              {state.visibleAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
