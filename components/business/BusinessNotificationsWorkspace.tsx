"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  BookOpenCheck,
  Boxes,
  Check,
  CheckCheck,
  Clock3,
  Handshake,
  Info,
  ReceiptText,
  Settings2,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  UserCog,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type WorkspaceMode = "advanced_company" | "simple_shop";
type NotificationCategory =
  | "sales"
  | "purchases"
  | "inventory"
  | "crm"
  | "team"
  | "accounting"
  | "system";
type NotificationSeverity = "critical" | "warning" | "info" | "success";

type BusinessNotification = {
  id: string;
  event_key: string;
  category: NotificationCategory;
  kind: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  action_path: string;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  read: boolean;
  read_at: string | null;
  snoozed_until: string | null;
};

type NotificationPreferences = {
  business_id: string;
  user_id: string;
  in_app_enabled: boolean;
  sales_alerts_enabled: boolean;
  purchase_alerts_enabled: boolean;
  inventory_alerts_enabled: boolean;
  crm_alerts_enabled: boolean;
  team_alerts_enabled: boolean;
  accounting_alerts_enabled: boolean;
  realtime_enabled: boolean;
};

type NotificationSettings = {
  business_id: string;
  due_soon_days: number;
  fiscal_period_warning_days: number;
  receivable_alerts_enabled: boolean;
  payable_alerts_enabled: boolean;
  low_stock_alerts_enabled: boolean;
  crm_alerts_enabled: boolean;
  team_alerts_enabled: boolean;
  accounting_alerts_enabled: boolean;
  updated_by: string | null;
};

export type BusinessNotificationsSnapshot = {
  business: {
    id: string;
    name: string;
    slug: string;
    workspace_mode: WorkspaceMode;
    timezone: string;
  };
  summary: {
    active: number;
    unread: number;
    critical: number;
    snoozed: number;
  };
  category_counts: Partial<Record<NotificationCategory, number>>;
  notifications: BusinessNotification[];
  preferences: NotificationPreferences;
  settings: NotificationSettings;
  can_manage: boolean;
};

type FilterKey = "all" | "unread" | "critical" | NotificationCategory;

type CategoryDefinition = {
  label: string;
  icon: LucideIcon;
  preferenceKey?: keyof NotificationPreferences;
};

const CATEGORY_DEFINITIONS: Record<NotificationCategory, CategoryDefinition> = {
  sales: { label: "Sales", icon: ReceiptText, preferenceKey: "sales_alerts_enabled" },
  purchases: {
    label: "Purchases",
    icon: ShoppingCart,
    preferenceKey: "purchase_alerts_enabled",
  },
  inventory: {
    label: "Inventory",
    icon: Boxes,
    preferenceKey: "inventory_alerts_enabled",
  },
  crm: { label: "CRM", icon: Handshake, preferenceKey: "crm_alerts_enabled" },
  team: { label: "Team", icon: UserCog, preferenceKey: "team_alerts_enabled" },
  accounting: {
    label: "Accounting",
    icon: BookOpenCheck,
    preferenceKey: "accounting_alerts_enabled",
  },
  system: { label: "System", icon: Sparkles },
};

const SEVERITY_STYLES: Record<
  NotificationSeverity,
  { label: string; icon: LucideIcon; iconClass: string; surfaceClass: string }
> = {
  critical: {
    label: "Critical",
    icon: ShieldAlert,
    iconClass: "text-danger",
    surfaceClass: "bg-danger-soft",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    iconClass: "text-warning",
    surfaceClass: "bg-warning-soft",
  },
  info: {
    label: "Information",
    icon: Info,
    iconClass: "text-info",
    surfaceClass: "bg-info-soft",
  },
  success: {
    label: "Completed",
    icon: Check,
    iconClass: "text-success",
    surfaceClass: "bg-success-soft",
  },
};

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatKind(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function summaryNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export default function BusinessNotificationsWorkspace({
  snapshot,
}: {
  snapshot: BusinessNotificationsSnapshot;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [localSnapshot, setLocalSnapshot] = useState(snapshot);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [preferences, setPreferences] = useState(snapshot.preferences);
  const [settings, setSettings] = useState(snapshot.settings);

  useEffect(() => {
    setLocalSnapshot(snapshot);
    setPreferences(snapshot.preferences);
    setSettings(snapshot.settings);
  }, [snapshot]);

  useEffect(() => {
    if (!preferences.realtime_enabled) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 220);
    };

    const channel = supabase
      .channel(`business-notification-center:${snapshot.business.id}:${preferences.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_notifications",
          filter: `business_id=eq.${snapshot.business.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_notification_states",
          filter: `business_id=eq.${snapshot.business.id}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [preferences.realtime_enabled, preferences.user_id, router, snapshot.business.id, supabase]);

  const filteredNotifications = localSnapshot.notifications.filter((notification) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !notification.read;
    if (activeFilter === "critical") return notification.severity === "critical";
    return notification.category === activeFilter;
  });

  function optimisticallyUpdate(notificationId: string, action: string) {
    setLocalSnapshot((current) => {
      if (action === "dismiss" || action === "snooze") {
        const target = current.notifications.find((item) => item.id === notificationId);
        const notifications = current.notifications.filter((item) => item.id !== notificationId);
        return {
          ...current,
          notifications,
          summary: {
            ...current.summary,
            active: Math.max(0, current.summary.active - 1),
            unread: Math.max(0, current.summary.unread - (target?.read ? 0 : 1)),
            critical: Math.max(
              0,
              current.summary.critical - (target?.severity === "critical" ? 1 : 0),
            ),
            snoozed: current.summary.snoozed + (action === "snooze" ? 1 : 0),
          },
        };
      }

      const target = current.notifications.find((item) => item.id === notificationId);
      if (!target) return current;
      const nextRead = action === "read";
      if (target.read === nextRead) return current;
      return {
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === notificationId ? { ...item, read: nextRead } : item,
        ),
        summary: {
          ...current.summary,
          unread: Math.max(0, current.summary.unread + (nextRead ? -1 : 1)),
        },
      };
    });
  }

  async function updateNotificationState(
    notification: BusinessNotification,
    action: "read" | "unread" | "dismiss" | "snooze",
    snoozedUntil: string | null = null,
  ) {
    if (busyId) return;
    const previous = localSnapshot;
    setBusyId(notification.id);
    optimisticallyUpdate(notification.id, action);

    const { error } = await supabase.rpc("set_business_notification_state", {
      p_business_id: snapshot.business.id,
      p_notification_id: notification.id,
      p_action: action,
      p_snoozed_until: snoozedUntil,
    });
    setBusyId(null);

    if (error) {
      console.error("Business notification state update failed", { code: error.code });
      setLocalSnapshot(previous);
      toast.error("Notification could not be updated.");
      return;
    }

    if (action === "dismiss") toast.success("Notification dismissed.");
    if (action === "snooze") toast.success("Notification snoozed.");
    router.refresh();
  }

  async function markAllRead() {
    if (markingAll || localSnapshot.summary.unread === 0) return;
    setMarkingAll(true);
    const previous = localSnapshot;
    setLocalSnapshot((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({ ...item, read: true })),
      summary: { ...current.summary, unread: 0 },
    }));

    const { error } = await supabase.rpc("mark_all_business_notifications_read", {
      p_business_id: snapshot.business.id,
    });
    setMarkingAll(false);

    if (error) {
      console.error("Business notifications mark-all failed", { code: error.code });
      setLocalSnapshot(previous);
      toast.error("Notifications could not be marked as read.");
      return;
    }

    toast.success("All visible notifications marked as read.");
    router.refresh();
  }

  async function savePreferences() {
    if (savingPreferences) return;
    setSavingPreferences(true);
    const { error } = await supabase.rpc("update_business_notification_preferences", {
      p_business_id: snapshot.business.id,
      p_preferences: preferences,
    });
    setSavingPreferences(false);

    if (error) {
      console.error("Business notification preferences failed", { code: error.code });
      toast.error("Notification preferences could not be saved.");
      return;
    }

    toast.success("Notification preferences saved.");
    router.refresh();
  }

  async function saveSettings() {
    if (savingSettings || !localSnapshot.can_manage) return;
    setSavingSettings(true);
    const { error } = await supabase.rpc("update_business_notification_settings", {
      p_business_id: snapshot.business.id,
      p_settings: settings,
    });
    setSavingSettings(false);

    if (error) {
      console.error("Business notification settings failed", { code: error.code });
      toast.error(
        error.code === "42501"
          ? "Only an authorized notification manager can change company thresholds."
          : "Company alert settings could not be saved.",
      );
      return;
    }

    toast.success("Company alert settings saved.");
    router.refresh();
  }

  const filters: Array<{ key: FilterKey; label: string; count?: number }> = [
    { key: "all", label: "All", count: localSnapshot.summary.active },
    { key: "unread", label: "Unread", count: localSnapshot.summary.unread },
    { key: "critical", label: "Critical", count: localSnapshot.summary.critical },
    ...(
      Object.entries(CATEGORY_DEFINITIONS) as Array<
        [NotificationCategory, CategoryDefinition]
      >
    )
      .filter(([category]) => summaryNumber(localSnapshot.category_counts[category]) > 0)
      .map(([category, definition]) => ({
        key: category as FilterKey,
        label: definition.label,
        count: summaryNumber(localSnapshot.category_counts[category]),
      })),
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={BellRing}
          label="Active alerts"
          value={localSnapshot.summary.active}
          detail="Visible for your role"
          tone="primary"
        />
        <SummaryCard
          icon={Bell}
          label="Unread"
          value={localSnapshot.summary.unread}
          detail="Needs your attention"
          tone={localSnapshot.summary.unread > 0 ? "warning" : "success"}
        />
        <SummaryCard
          icon={ShieldAlert}
          label="Critical"
          value={localSnapshot.summary.critical}
          detail="Overdue or out of stock"
          tone={localSnapshot.summary.critical > 0 ? "danger" : "success"}
        />
        <SummaryCard
          icon={Clock3}
          label="Snoozed"
          value={localSnapshot.summary.snoozed}
          detail="Returns automatically"
          tone="info"
        />
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              Notification inbox
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary">
              Business alerts and events
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Alerts are filtered by your role, custom permissions, individual preferences, and
              this company&apos;s source-of-truth records.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={markingAll}
            loadingLabel="Marking…"
            disabled={localSnapshot.summary.unread === 0}
            onClick={() => void markAllRead()}
          >
            <CheckCheck aria-hidden="true" /> Mark all read
          </Button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`finance-focus inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-black transition-colors ${
                activeFilter === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-secondary text-text-secondary hover:text-text-primary"
              }`}
            >
              {filter.label}
              {typeof filter.count === "number" ? (
                <span className="tabular-nums opacity-75">{filter.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-10 text-center">
            <CheckCheck className="mx-auto size-7 text-success" aria-hidden="true" />
            <h3 className="mt-3 font-black text-text-primary">All caught up</h3>
            <p className="mt-1 text-sm text-text-secondary">
              No notifications match this filter.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                timezone={snapshot.business.timezone}
                busy={busyId === notification.id}
                onAction={updateNotificationState}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <PreferencePanel
          preferences={preferences}
          setPreferences={setPreferences}
          saving={savingPreferences}
          workspaceMode={snapshot.business.workspace_mode}
          onSave={savePreferences}
        />
        {localSnapshot.can_manage ? (
          <CompanySettingsPanel
            settings={settings}
            setSettings={setSettings}
            saving={savingSettings}
            workspaceMode={snapshot.business.workspace_mode}
            onSave={saveSettings}
          />
        ) : (
          <section className="rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-info-soft text-info">
                <Settings2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-black text-text-primary">Company alert thresholds</h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Thresholds are managed by the Owner, Admin, or a member with the explicit
                  notifications.manage permission. Your personal category preferences remain fully
                  editable.
                </p>
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  tone: "primary" | "danger" | "warning" | "success" | "info";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
  }[tone];

  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)] sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] ${toneClass}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <strong className="text-2xl font-black tabular-nums text-text-primary">{value}</strong>
      </div>
      <h3 className="mt-4 text-sm font-black text-text-primary">{label}</h3>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
    </article>
  );
}

function NotificationRow({
  notification,
  timezone,
  busy,
  onAction,
}: {
  notification: BusinessNotification;
  timezone: string;
  busy: boolean;
  onAction: (
    notification: BusinessNotification,
    action: "read" | "unread" | "dismiss" | "snooze",
    snoozedUntil?: string | null,
  ) => Promise<void>;
}) {
  const category = CATEGORY_DEFINITIONS[notification.category];
  const severity = SEVERITY_STYLES[notification.severity];
  const CategoryIcon = category.icon;
  const SeverityIcon = severity.icon;

  function snooze(days: number) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    void onAction(notification, "snooze", until.toISOString());
  }

  return (
    <article
      className={`rounded-[var(--radius-button)] px-4 py-4 transition-colors sm:px-5 ${
        notification.read ? "bg-surface-secondary" : "bg-primary-soft/55"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] ${severity.surfaceClass} ${severity.iconClass}`}
        >
          <CategoryIcon className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-text-secondary">
              {category.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${severity.surfaceClass} ${severity.iconClass}`}
            >
              <SeverityIcon className="size-3" aria-hidden="true" /> {severity.label}
            </span>
            {!notification.read ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary">
                <span className="size-1.5 rounded-full bg-primary" /> Unread
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 text-sm font-black leading-5 text-text-primary sm:text-base">
            {notification.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{notification.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-text-tertiary">
            <span>{formatKind(notification.kind)}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={notification.created_at}>
              {formatDateTime(notification.created_at, timezone)}
            </time>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[16rem] sm:justify-end">
          <Link
            href={notification.action_path}
            className="finance-focus inline-flex min-h-9 items-center rounded-[var(--radius-button)] bg-primary px-3 text-xs font-black text-primary-foreground"
          >
            Open source
          </Link>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void onAction(notification, notification.read ? "unread" : "read", null)
            }
          >
            {notification.read ? "Mark unread" : "Mark read"}
          </Button>
          <details className="relative">
            <summary className="finance-focus flex min-h-9 cursor-pointer list-none items-center rounded-[var(--radius-button)] bg-surface px-3 text-xs font-black text-text-secondary">
              More
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-[var(--radius-button)] bg-surface p-2 shadow-[var(--shadow-md)]">
              <button
                type="button"
                disabled={busy}
                onClick={() => snooze(1)}
                className="finance-focus flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-button)] px-3 text-left text-xs font-bold text-text-secondary hover:bg-surface-secondary"
              >
                <Clock3 className="size-4" aria-hidden="true" /> Snooze 1 day
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => snooze(7)}
                className="finance-focus flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-button)] px-3 text-left text-xs font-bold text-text-secondary hover:bg-surface-secondary"
              >
                <Clock3 className="size-4" aria-hidden="true" /> Snooze 7 days
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAction(notification, "dismiss", null)}
                className="finance-focus flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-button)] px-3 text-left text-xs font-bold text-danger hover:bg-danger-soft"
              >
                <X className="size-4" aria-hidden="true" /> Dismiss
              </button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function PreferencePanel({
  preferences,
  setPreferences,
  saving,
  workspaceMode,
  onSave,
}: {
  preferences: NotificationPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences>>;
  saving: boolean;
  workspaceMode: WorkspaceMode;
  onSave: () => Promise<void>;
}) {
  const categoryRows = (
    Object.entries(CATEGORY_DEFINITIONS) as Array<
      [NotificationCategory, CategoryDefinition]
    >
  ).filter(
    ([category, definition]) =>
      definition.preferenceKey &&
      (workspaceMode === "advanced_company" || !["crm", "accounting"].includes(category)),
  );

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <Bell className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black text-text-primary">My notification preferences</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            These settings affect only your account inside this business.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <ToggleRow
          label="In-app notifications"
          detail="Show the business notification inbox and alert bell."
          checked={preferences.in_app_enabled}
          onChange={(checked) =>
            setPreferences((current) => ({ ...current, in_app_enabled: checked }))
          }
        />
        <ToggleRow
          label="Live updates"
          detail="Refresh the notification center when a new allowed event arrives."
          checked={preferences.realtime_enabled}
          onChange={(checked) =>
            setPreferences((current) => ({ ...current, realtime_enabled: checked }))
          }
        />
        {categoryRows.map(([category, definition]) => {
          const key = definition.preferenceKey!;
          return (
            <ToggleRow
              key={category}
              label={`${definition.label} alerts`}
              detail={`Show ${definition.label.toLowerCase()} notifications allowed by your role.`}
              checked={Boolean(preferences[key])}
              onChange={(checked) =>
                setPreferences((current) => ({ ...current, [key]: checked }))
              }
            />
          );
        })}
      </div>

      <Button
        type="button"
        className="mt-5 w-full sm:w-auto"
        loading={saving}
        loadingLabel="Saving preferences…"
        onClick={() => void onSave()}
      >
        Save my preferences
      </Button>
    </section>
  );
}

function CompanySettingsPanel({
  settings,
  setSettings,
  saving,
  workspaceMode,
  onSave,
}: {
  settings: NotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  saving: boolean;
  workspaceMode: WorkspaceMode;
  onSave: () => Promise<void>;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-warning-soft text-warning">
          <Settings2 className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-black text-text-primary">Company alert thresholds</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            These controls change alert generation for every authorized member.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-black text-text-secondary">Due-soon window</span>
          <Input
            type="number"
            min={1}
            max={30}
            value={settings.due_soon_days}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                due_soon_days: Number(event.target.value),
              }))
            }
          />
          <span className="block text-[11px] text-text-tertiary">1–30 days</span>
        </label>
        {workspaceMode === "advanced_company" ? (
          <label className="space-y-2">
            <span className="text-xs font-black text-text-secondary">
              Fiscal-period warning
            </span>
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.fiscal_period_warning_days}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  fiscal_period_warning_days: Number(event.target.value),
                }))
              }
            />
            <span className="block text-[11px] text-text-tertiary">1–60 days</span>
          </label>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        <ToggleRow
          label="Receivable due alerts"
          detail="Issued customer invoices with an outstanding balance."
          checked={settings.receivable_alerts_enabled}
          onChange={(checked) =>
            setSettings((current) => ({ ...current, receivable_alerts_enabled: checked }))
          }
        />
        <ToggleRow
          label="Payable due alerts"
          detail="Issued supplier bills with an outstanding balance."
          checked={settings.payable_alerts_enabled}
          onChange={(checked) =>
            setSettings((current) => ({ ...current, payable_alerts_enabled: checked }))
          }
        />
        <ToggleRow
          label="Low-stock alerts"
          detail="Inventory at or below each product reorder level."
          checked={settings.low_stock_alerts_enabled}
          onChange={(checked) =>
            setSettings((current) => ({ ...current, low_stock_alerts_enabled: checked }))
          }
        />
        {workspaceMode === "advanced_company" ? (
          <>
            <ToggleRow
              label="CRM follow-up alerts"
              detail="Open assigned activities approaching or past their due time."
              checked={settings.crm_alerts_enabled}
              onChange={(checked) =>
                setSettings((current) => ({ ...current, crm_alerts_enabled: checked }))
              }
            />
            <ToggleRow
              label="Accounting period alerts"
              detail="Open fiscal periods approaching or passing their end date."
              checked={settings.accounting_alerts_enabled}
              onChange={(checked) =>
                setSettings((current) => ({ ...current, accounting_alerts_enabled: checked }))
              }
            />
          </>
        ) : null}
        <ToggleRow
          label="Team and invitation alerts"
          detail="Failed or expiring invitations and important access events."
          checked={settings.team_alerts_enabled}
          onChange={(checked) =>
            setSettings((current) => ({ ...current, team_alerts_enabled: checked }))
          }
        />
      </div>

      <Button
        type="button"
        className="mt-5 w-full sm:w-auto"
        loading={saving}
        loadingLabel="Saving thresholds…"
        onClick={() => void onSave()}
      >
        Save company settings
      </Button>
    </section>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-black text-text-primary">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">{detail}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 shrink-0 accent-primary"
      />
    </label>
  );
}
