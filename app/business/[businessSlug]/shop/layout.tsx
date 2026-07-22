import type { ReactNode } from "react";

import BusinessNotificationBell from "@/components/business/BusinessNotificationBell";
import { createClient } from "@/lib/supabase/server";

type NotificationSnapshot = {
  summary?: { unread?: number; critical?: number };
  preferences?: { realtime_enabled?: boolean };
};

export default async function SimpleShopLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let bell: ReactNode = null;

  if (user) {
    const businessResult = await supabase
      .from("businesses")
      .select("id, slug, workspace_mode, status")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (
      businessResult.data?.status === "active" &&
      businessResult.data.workspace_mode === "simple_shop"
    ) {
      const membershipResult = await supabase
        .from("business_members")
        .select("status")
        .eq("business_id", businessResult.data.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipResult.data?.status === "active") {
        const notificationResult = await supabase.rpc(
          "get_business_notifications_snapshot",
          {
            p_business_id: businessResult.data.id,
            p_limit: 1,
          },
        );

        if (notificationResult.error) {
          console.error("Simple Shop notification bell failed", {
            code: notificationResult.error.code,
          });
        }

        const snapshot = (notificationResult.data ?? {}) as NotificationSnapshot;
        bell = (
          <div className="fixed bottom-5 right-5 z-30 rounded-[var(--radius-button)] bg-surface shadow-[var(--shadow-md)] sm:bottom-6 sm:right-6 lg:right-8">
            <BusinessNotificationBell
              businessId={businessResult.data.id}
              businessSlug={businessResult.data.slug}
              unreadCount={Number(snapshot.summary?.unread ?? 0)}
              criticalCount={Number(snapshot.summary?.critical ?? 0)}
              realtimeEnabled={snapshot.preferences?.realtime_enabled !== false}
            />
          </div>
        );
      }
    }
  }

  return (
    <>
      {children}
      {bell}
    </>
  );
}
