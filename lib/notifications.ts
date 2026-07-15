import { formatDateKey, getAppDateKey, getDaysInMonth } from "./dates";

export type NotificationSource = "goal" | "payable";
export type NotificationTone = "danger" | "warning" | "info";
export type NotificationUrgency = "Overdue" | "Due today" | "Due soon";

export const DEFAULT_VISIBLE_ALERT_LIMIT = 12;

export interface NotificationAlert {
  id: string;
  source: NotificationSource;
  tone: NotificationTone;
  urgency: NotificationUrgency;
  title: string;
  description: string;
  dateKey: string;
  href: string;
}

export interface PayableNotificationRecord {
  id: string;
  person_name: string;
  item_name?: string | null;
  reason?: string | null;
  remaining_amount: number | string | null;
  due_date: string | null;
  status?: string | null;
}

export interface GoalNotificationRecord {
  id: string;
  name: string;
  target_amount: number | string | null;
  current_amount: number | string | null;
  deadline: string | null;
}

export interface NotificationState {
  status: "ready" | "partial" | "error";
  visibleAlerts: NotificationAlert[];
  totalActiveAlertCountFromCheckedRecords: number | null;
  unavailableSources: NotificationSource[];
}

export interface DerivedNotifications {
  visibleAlerts: NotificationAlert[];
  totalActiveAlertCountFromCheckedRecords: number;
}

type DeriveNotificationsOptions = {
  payables?: readonly PayableNotificationRecord[];
  goals?: readonly GoalNotificationRecord[];
  now?: Date;
  visibleLimit?: number;
};

type CreateNotificationStateOptions = DeriveNotificationsOptions & {
  unavailableSources?: readonly NotificationSource[];
};

const TONE_PRIORITY: Record<NotificationTone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

function toFiniteNumber(value: number | string | null) {
  if (value === null || (typeof value === "string" && !value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getValidDateKey(value: string | null | undefined) {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > getDaysInMonth(year, month)
  ) {
    return null;
  }

  return formatDateKey(year, month, day);
}

function dateKeyToUtcDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const validDateKey = getValidDateKey(dateKey);
  if (!validDateKey || !Number.isInteger(days)) return null;

  const [year, month, day] = validDateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return formatDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function getDateUrgency(dateKey: string, todayKey: string) {
  const difference = dateKeyToUtcDay(dateKey) - dateKeyToUtcDay(todayKey);

  if (difference < 0) {
    return { urgency: "Overdue" as const, tone: "danger" as const };
  }

  if (difference === 0) {
    return { urgency: "Due today" as const, tone: "warning" as const };
  }

  if (difference <= 7) {
    return { urgency: "Due soon" as const, tone: "warning" as const };
  }

  return null;
}

function getGoalUrgency(dateKey: string, todayKey: string) {
  const urgency = getDateUrgency(dateKey, todayKey);
  if (!urgency || urgency.tone !== "warning" || urgency.urgency === "Due today") {
    return urgency;
  }

  return { ...urgency, tone: "info" as const };
}

export function derivePayableAlerts(
  payables: readonly PayableNotificationRecord[],
  now: Date = new Date(),
) {
  const todayKey = getAppDateKey(now);

  return payables.flatMap<NotificationAlert>((payable) => {
    const remainingAmount = toFiniteNumber(payable.remaining_amount);
    const dateKey = getValidDateKey(payable.due_date);

    if (
      remainingAmount === null ||
      remainingAmount <= 0 ||
      payable.status === "completed" ||
      !dateKey
    ) {
      return [];
    }

    const timing = getDateUrgency(dateKey, todayKey);
    if (!timing) return [];

    const subject = payable.person_name.trim() || payable.item_name?.trim() || "Payable";
    const title =
      timing.urgency === "Overdue"
        ? `${subject} payable is overdue`
        : timing.urgency === "Due today"
          ? `${subject} payable is due today`
          : `${subject} payable is due soon`;

    return [
      {
        id: `payable:${payable.id}:due`,
        source: "payable",
        tone: timing.tone,
        urgency: timing.urgency,
        title,
        description: "This payable still has an outstanding balance.",
        dateKey,
        href: "/dashboard/payables",
      },
    ];
  });
}

export function deriveGoalAlerts(
  goals: readonly GoalNotificationRecord[],
  now: Date = new Date(),
) {
  const todayKey = getAppDateKey(now);

  return goals.flatMap<NotificationAlert>((goal) => {
    const targetAmount = toFiniteNumber(goal.target_amount);
    const currentAmount = toFiniteNumber(goal.current_amount);
    const dateKey = getValidDateKey(goal.deadline);

    if (
      targetAmount === null ||
      currentAmount === null ||
      targetAmount <= 0 ||
      currentAmount >= targetAmount ||
      !dateKey
    ) {
      return [];
    }

    const timing = getGoalUrgency(dateKey, todayKey);
    if (!timing) return [];

    const subject = goal.name.trim() || "Goal";
    const title =
      timing.urgency === "Overdue"
        ? `${subject} deadline is overdue`
        : timing.urgency === "Due today"
          ? `${subject} deadline is today`
          : `${subject} deadline is approaching`;

    return [
      {
        id: `goal:${goal.id}:deadline`,
        source: "goal",
        tone: timing.tone,
        urgency: timing.urgency,
        title,
        description: "This goal has not reached its target yet.",
        dateKey,
        href: "/dashboard/goals",
      },
    ];
  });
}

export function sortNotificationAlerts(alerts: readonly NotificationAlert[]) {
  return [...alerts].sort((left, right) => {
    const toneDifference = TONE_PRIORITY[left.tone] - TONE_PRIORITY[right.tone];
    if (toneDifference !== 0) return toneDifference;

    const dateDifference = left.dateKey.localeCompare(right.dateKey);
    if (dateDifference !== 0) return dateDifference;

    return left.id.localeCompare(right.id);
  });
}

export function deriveNotifications({
  payables = [],
  goals = [],
  now = new Date(),
  visibleLimit = DEFAULT_VISIBLE_ALERT_LIMIT,
}: DeriveNotificationsOptions): DerivedNotifications {
  const boundedVisibleLimit = Number.isFinite(visibleLimit)
    ? Math.max(0, Math.floor(visibleLimit))
    : DEFAULT_VISIBLE_ALERT_LIMIT;
  const allAlerts = sortNotificationAlerts([
    ...derivePayableAlerts(payables, now),
    ...deriveGoalAlerts(goals, now),
  ]);

  return {
    visibleAlerts: allAlerts.slice(0, boundedVisibleLimit),
    totalActiveAlertCountFromCheckedRecords: allAlerts.length,
  };
}

export function createNotificationState({
  payables = [],
  goals = [],
  now = new Date(),
  visibleLimit = DEFAULT_VISIBLE_ALERT_LIMIT,
  unavailableSources = [],
}: CreateNotificationStateOptions): NotificationState {
  const normalizedUnavailableSources = (
    ["payable", "goal"] as const
  ).filter((source) => unavailableSources.includes(source));

  if (normalizedUnavailableSources.length === 2) {
    return {
      status: "error",
      visibleAlerts: [],
      totalActiveAlertCountFromCheckedRecords: null,
      unavailableSources: normalizedUnavailableSources,
    };
  }

  const derived = deriveNotifications({
    payables,
    goals,
    now,
    visibleLimit,
  });

  return {
    status:
      normalizedUnavailableSources.length === 0 ? "ready" : "partial",
    ...derived,
    unavailableSources: normalizedUnavailableSources,
  };
}

export function getNotificationTriggerLabel(state: NotificationState) {
  const count = state.totalActiveAlertCountFromCheckedRecords;
  if (count === null || count === 0) return "Open notification center";

  const qualifier = state.status === "partial" ? " from available data" : "";
  return `Open notification center, ${count} active ${count === 1 ? "alert" : "alerts"}${qualifier}`;
}

export function getNotificationSummary(state: NotificationState) {
  const count = state.totalActiveAlertCountFromCheckedRecords;

  if (count === null) return "Alert data unavailable";
  if (count === 0) {
    return state.status === "partial"
      ? "No alerts in available data."
      : "No current alerts.";
  }

  const qualifier = state.status === "partial" ? " from available data" : "";
  if (state.visibleAlerts.length < count) {
    return `Showing ${state.visibleAlerts.length} of ${count} active alerts${qualifier}.`;
  }

  return `${count} active ${count === 1 ? "alert" : "alerts"}${qualifier}.`;
}
