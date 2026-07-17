import { describe, expect, it } from "vitest";

import {
  createNotificationState,
  deriveGoalAlerts,
  deriveNotifications,
  derivePayableAlerts,
  getNotificationSummary,
  getNotificationTriggerLabel,
  type GoalNotificationRecord,
  type PayableNotificationRecord,
} from "./notifications";

const FIXED_NOW = new Date("2026-07-15T06:00:00.000Z");

function payable(
  overrides: Partial<PayableNotificationRecord> = {},
): PayableNotificationRecord {
  return {
    id: "payable-1",
    person_name: "Adeel",
    item_name: null,
    reason: "Loan",
    remaining_amount: 500,
    due_date: "2026-07-15",
    status: "pending",
    ...overrides,
  };
}

function goal(
  overrides: Partial<GoalNotificationRecord> = {},
): GoalNotificationRecord {
  return {
    id: "goal-1",
    name: "Emergency fund",
    target_amount: 10_000,
    current_amount: 4_000,
    deadline: "2026-07-15",
    ...overrides,
  };
}

describe("payable alert derivation", () => {
  it("derives overdue, due-today, and due-within-seven-days alerts", () => {
    const alerts = derivePayableAlerts(
      [
        payable({ id: "overdue", due_date: "2026-07-14" }),
        payable({ id: "today" }),
        payable({ id: "soon", due_date: "2026-07-22" }),
      ],
      FIXED_NOW,
    );

    expect(alerts.map((alert) => [alert.id, alert.tone, alert.urgency])).toEqual([
      ["payable:overdue:due", "danger", "Overdue"],
      ["payable:today:due", "warning", "Due today"],
      ["payable:soon:due", "warning", "Due soon"],
    ]);
  });

  it("excludes alerts outside the horizon", () => {
    expect(
      derivePayableAlerts(
        [payable({ due_date: "2026-07-23" })],
        FIXED_NOW,
      ),
    ).toEqual([]);
  });

  it("excludes completed or zero-remaining payables", () => {
    expect(
      derivePayableAlerts(
        [
          payable({ id: "zero", remaining_amount: 0 }),
          payable({ id: "complete", status: "completed" }),
        ],
        FIXED_NOW,
      ),
    ).toEqual([]);
  });

  it("excludes malformed payable dates and non-finite amounts", () => {
    expect(
      derivePayableAlerts(
        [
          payable({ id: "bad-date", due_date: "2026-02-30" }),
          payable({ id: "bad-amount", remaining_amount: "not-a-number" }),
        ],
        FIXED_NOW,
      ),
    ).toEqual([]);
  });
});

describe("goal alert derivation", () => {
  it("derives overdue, deadline-today, and deadline-within-seven-days alerts", () => {
    const alerts = deriveGoalAlerts(
      [
        goal({ id: "overdue", deadline: "2026-07-14" }),
        goal({ id: "today" }),
        goal({ id: "soon", deadline: "2026-07-22" }),
      ],
      FIXED_NOW,
    );

    expect(alerts.map((alert) => [alert.id, alert.tone, alert.urgency])).toEqual([
      ["goal:overdue:deadline", "danger", "Overdue"],
      ["goal:today:deadline", "warning", "Due today"],
      ["goal:soon:deadline", "info", "Due soon"],
    ]);
  });

  it("excludes funded goals, goals without deadlines, and malformed dates", () => {
    expect(
      deriveGoalAlerts(
        [
          goal({ id: "funded", current_amount: 10_000 }),
          goal({ id: "no-deadline", deadline: null }),
          goal({ id: "bad-date", deadline: "not-a-date" }),
        ],
        FIXED_NOW,
      ),
    ).toEqual([]);
  });
});

describe("combined notification behavior", () => {
  it("sorts deterministically by severity, date, and stable ID", () => {
    const { visibleAlerts } = deriveNotifications({
      now: FIXED_NOW,
      payables: [
        payable({ id: "warning-b", due_date: "2026-07-16" }),
        payable({ id: "danger-b", due_date: "2026-07-14" }),
      ],
      goals: [
        goal({ id: "danger-a", deadline: "2026-07-13" }),
        goal({ id: "warning-a", deadline: "2026-07-15" }),
        goal({ id: "info-a", deadline: "2026-07-18" }),
      ],
    });

    expect(visibleAlerts.map((alert) => alert.id)).toEqual([
      "goal:danger-a:deadline",
      "payable:danger-b:due",
      "goal:warning-a:deadline",
      "payable:warning-b:due",
      "goal:info-a:deadline",
    ]);
  });

  it("uses stable IDs as an alert changes from due-soon to due-today", () => {
    const record = payable({ id: "stable", due_date: "2026-07-16" });
    const soonId = derivePayableAlerts([record], FIXED_NOW)[0]?.id;
    const todayId = derivePayableAlerts(
      [record],
      new Date("2026-07-16T06:00:00.000Z"),
    )[0]?.id;

    expect(soonId).toBe("payable:stable:due");
    expect(todayId).toBe(soonId);
  });

  it("keeps the visible list bounded while preserving the total active count", () => {
    const payables = Array.from({ length: 20 }, (_, index) =>
      payable({ id: `p-${index}` }),
    );
    const derived = deriveNotifications({
      payables,
      now: FIXED_NOW,
      visibleLimit: 12,
    });

    expect(derived.totalActiveAlertCountFromCheckedRecords).toBe(20);
    expect(derived.visibleAlerts).toHaveLength(12);
  });

  it("uses the total active count in trigger and visible-list summary logic", () => {
    const state = createNotificationState({
      payables: Array.from({ length: 20 }, (_, index) =>
        payable({ id: `p-${index}` }),
      ),
      now: FIXED_NOW,
    });

    expect(getNotificationTriggerLabel(state)).toBe(
      "Open notification center, 20 unread alerts",
    );
    expect(getNotificationSummary(state)).toBe(
      "Showing 12 of 20 active alerts, 20 unread.",
    );
  });

  it("keeps successful-source alerts and labels partial counts as available data", () => {
    const state = createNotificationState({
      payables: [payable()],
      now: FIXED_NOW,
      unavailableSources: ["goal"],
    });

    expect(state.status).toBe("partial");
    expect(state.unavailableSources).toEqual(["goal"]);
    expect(state.totalActiveAlertCountFromCheckedRecords).toBe(1);
    expect(state.visibleAlerts).toHaveLength(1);
    expect(getNotificationTriggerLabel(state)).toBe(
      "Open notification center, 1 unread alert from available data",
    );
    expect(getNotificationSummary(state)).toBe(
      "1 active alert, 1 unread from available data.",
    );
  });

  it("exposes no count when both sources are unavailable", () => {
    const state = createNotificationState({
      now: FIXED_NOW,
      unavailableSources: ["payable", "goal"],
    });

    expect(state.status).toBe("error");
    expect(state.totalActiveAlertCountFromCheckedRecords).toBeNull();
    expect(state.visibleAlerts).toEqual([]);
    expect(getNotificationTriggerLabel(state)).toBe("Open notification center");
  });

  it("uses Asia/Karachi date semantics for a fixed instant", () => {
    const nearKarachiMidnight = new Date("2026-07-14T19:30:00.000Z");
    const alerts = deriveGoalAlerts([goal()], nearKarachiMidnight);

    expect(alerts[0]?.urgency).toBe("Due today");
  });

  it("applies persisted read, dismiss, and snooze state to deterministic alerts", () => {
    const notificationId = "goal:goal-1:deadline";
    const unread = createNotificationState({ goals: [goal()], now: FIXED_NOW });
    const read = createNotificationState({
      goals: [goal()],
      now: FIXED_NOW,
      userStates: [{ notification_id: notificationId, read_at: "2026-07-15T07:00:00Z" }],
    });
    const dismissed = createNotificationState({
      goals: [goal()],
      now: FIXED_NOW,
      userStates: [{ notification_id: notificationId, dismissed_at: "2026-07-15T07:00:00Z" }],
    });
    const snoozed = createNotificationState({
      goals: [goal()],
      now: FIXED_NOW,
      userStates: [{ notification_id: notificationId, snoozed_until: "2026-07-16T07:00:00Z" }],
    });

    expect(unread.visibleAlerts[0]?.read).toBe(false);
    expect(unread.unreadAlertCount).toBe(1);
    expect(read.visibleAlerts[0]?.read).toBe(true);
    expect(read.unreadAlertCount).toBe(0);
    expect(dismissed.visibleAlerts).toEqual([]);
    expect(snoozed.visibleAlerts).toEqual([]);
  });
});
