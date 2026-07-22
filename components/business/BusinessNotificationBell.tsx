"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type BusinessNotificationBellProps = {
  businessId: string;
  businessSlug: string;
  unreadCount: number;
  criticalCount: number;
  realtimeEnabled?: boolean;
};

export default function BusinessNotificationBell({
  businessId,
  businessSlug,
  unreadCount,
  criticalCount,
  realtimeEnabled = true,
}: BusinessNotificationBellProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!realtimeEnabled) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 180);
    };

    const channel = supabase
      .channel(`business-alert-bell:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_notifications",
          filter: `business_id=eq.${businessId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_notification_states",
          filter: `business_id=eq.${businessId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [businessId, realtimeEnabled, router, supabase]);

  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? `${unreadCount} unread business ${unreadCount === 1 ? "alert" : "alerts"}`
    : "Open business notifications";

  return (
    <Link
      href={`/business/${businessSlug}/notifications`}
      aria-label={label}
      title={label}
      className="finance-focus relative inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-surface-secondary text-text-secondary transition-[transform,color,background-color] hover:-translate-y-0.5 hover:bg-primary-soft hover:text-primary active:scale-[0.97]"
    >
      <Bell className="size-[18px]" strokeWidth={2.35} aria-hidden="true" />
      {hasUnread ? (
        <span
          className={`absolute right-1.5 top-1.5 size-2 rounded-full ${
            criticalCount > 0 ? "bg-danger" : "bg-primary"
          } shadow-[0_0_0_2px_var(--surface-secondary)]`}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}
