import "server-only";

import { getAppDateKey } from "@/lib/dates";
import {
  addDaysToDateKey,
  createNotificationState,
  type GoalNotificationRecord,
  type NotificationSource,
  type NotificationState,
  type PayableNotificationRecord,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

const SOURCE_QUERY_LIMIT = 60;

type SourceResult<T> =
  | { status: "ready"; data: T[] }
  | { status: "error"; source: NotificationSource };

export async function loadDashboardNotifications(
  now: Date = new Date(),
): Promise<NotificationState> {
  const todayKey = getAppDateKey(now);
  const horizonKey = addDaysToDateKey(todayKey, 7) ?? todayKey;

  try {
    const supabase = await createClient();

    const [preferencesResult, statesResult] = await Promise.all([
      supabase
        .from("notification_preferences")
        .select("goal_alerts_enabled, payable_alerts_enabled")
        .maybeSingle(),
      supabase
        .from("notification_states")
        .select("notification_id, read_at, dismissed_at, snoozed_until"),
    ]);

    if (preferencesResult.error) {
      console.error("[notifications] Preferences query failed", {
        code: preferencesResult.error.code ?? "unknown",
      });
    }
    if (statesResult.error) {
      console.error("[notifications] State query failed", {
        code: statesResult.error.code ?? "unknown",
      });
    }

    const goalAlertsEnabled =
      preferencesResult.error || preferencesResult.data === null
        ? true
        : preferencesResult.data.goal_alerts_enabled;
    const payableAlertsEnabled =
      preferencesResult.error || preferencesResult.data === null
        ? true
        : preferencesResult.data.payable_alerts_enabled;

    const payableRequest = supabase
      .from("liabilities")
      .select(
        "id, person_name, item_name, reason, remaining_amount, due_date, status",
      )
      .not("due_date", "is", null)
      .gt("remaining_amount", 0)
      .lte("due_date", horizonKey)
      .order("due_date", { ascending: true })
      .limit(SOURCE_QUERY_LIMIT);

    const goalRequest = supabase
      .from("goals")
      .select("id, name, target_amount, current_amount, deadline")
      .not("deadline", "is", null)
      .lte("deadline", horizonKey)
      .order("deadline", { ascending: true })
      .limit(SOURCE_QUERY_LIMIT);

    const loadPayables = async (): Promise<
      SourceResult<PayableNotificationRecord>
    > => {
      if (!payableAlertsEnabled) return { status: "ready", data: [] };

      try {
        const { data, error } = await payableRequest;
        return error
          ? { status: "error", source: "payable" }
          : {
              status: "ready",
              data: (data ?? []) as PayableNotificationRecord[],
            };
      } catch {
        return { status: "error", source: "payable" };
      }
    };

    const loadGoals = async (): Promise<SourceResult<GoalNotificationRecord>> => {
      if (!goalAlertsEnabled) return { status: "ready", data: [] };

      try {
        const { data, error } = await goalRequest;
        return error
          ? { status: "error", source: "goal" }
          : {
              status: "ready",
              data: (data ?? []) as GoalNotificationRecord[],
            };
      } catch {
        return { status: "error", source: "goal" };
      }
    };

    const [payableResult, goalResult] = await Promise.all([
      loadPayables(),
      loadGoals(),
    ]);

    const unavailableSources = [payableResult, goalResult].flatMap((result) =>
      result.status === "error" ? [result.source] : [],
    );
    const payables =
      payableResult.status === "ready" ? payableResult.data : [];
    const goals = goalResult.status === "ready" ? goalResult.data : [];

    return createNotificationState({
      payables,
      goals,
      now,
      unavailableSources,
      userStates: statesResult.error ? null : (statesResult.data ?? []),
    });
  } catch {
    return createNotificationState({
      now,
      unavailableSources: ["payable", "goal"],
    });
  }
}
