import { describe, expect, it } from "vitest";

import {
  deriveGoalAlerts,
  deriveNotifications,
  derivePayableAlerts,
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
    const alerts = deriveNotifications({
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

    expect(alerts.map((alert) => alert.id)).toEqual([
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

  it("bounds the visible result count", () => {
    const payables = Array.from({ length: 20 }, (_, index) =>
      payable({ id: `p-${index}` }),
    );

    expect(
      deriveNotifications({ payables, now: FIXED_NOW, limit: 12 }),
    ).toHaveLength(12);
  });

  it("uses Asia/Karachi date semantics for a fixed instant", () => {
    const nearKarachiMidnight = new Date("2026-07-14T19:30:00.000Z");
    const alerts = deriveGoalAlerts([goal()], nearKarachiMidnight);

    expect(alerts[0]?.urgency).toBe("Due today");
  });

  it("does not invent unread state", () => {
    const alert = deriveNotifications({ goals: [goal()], now: FIXED_NOW })[0];

    expect(alert).toBeDefined();
    expect(alert).not.toHaveProperty("unread");
    expect(alert).not.toHaveProperty("read");
  });
});
