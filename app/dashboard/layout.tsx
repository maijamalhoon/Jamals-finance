import type { Metadata } from "next";
import { Suspense } from "react";

import ConnectionStatus from "@/components/layout/ConnectionStatus";
import FloatingActions from "@/components/layout/FloatingActions";
import NotificationCenter, {
  NotificationCenterLoading,
} from "@/components/layout/NotificationCenter";
import ResponsiveDashboardHeader from "@/components/layout/ResponsiveDashboardHeader";
import DashboardScrollRestoration from "@/components/motion/DashboardScrollRestoration";
import type { NotificationState } from "@/lib/notifications";
import { loadDashboardNotifications } from "@/lib/notifications-server";

import "./dashboard-performance.css";
import "./portfolio-amount.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/dashboard",
  },
};

async function NotificationCenterSlot({
  statePromise,
}: {
  statePromise: Promise<NotificationState>;
}) {
  const state = await statePromise;

  return <NotificationCenter state={state} />;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const notificationStatePromise = loadDashboardNotifications();
  const notificationSlot = (
    <Suspense fallback={<NotificationCenterLoading />}>
      <NotificationCenterSlot statePromise={notificationStatePromise} />
    </Suspense>
  );

  return (
    <div
      data-dashboard-shell
      className="relative flex h-dvh min-w-0 overflow-hidden bg-background text-foreground"
    >
      <div
        aria-hidden="true"
        className="jf-node4-dashboard-ambient pointer-events-none absolute inset-0 z-0"
      />
      <div
        aria-hidden="true"
        className="jf-dashboard-grid pointer-events-none absolute inset-0 z-0 opacity-[0.34]"
      />

      <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col overflow-hidden">
        <ResponsiveDashboardHeader notificationSlot={notificationSlot} />
        <ConnectionStatus />
        <DashboardScrollRestoration />

        <main
          data-dashboard-scroll
          className="jf-dashboard-scroll relative flex-1 overflow-y-auto overscroll-contain px-3 pb-[var(--jf-mobile-content-bottom)] pt-[5rem] sm:px-5 sm:pb-[calc(var(--jf-mobile-content-bottom)+0.5rem)] sm:pt-[5.25rem] lg:px-6 lg:pb-10 lg:pt-6 xl:px-7"
        >
          <div className="jf-dashboard-content-frame mx-auto w-full max-w-[1480px] min-w-0">
            {children}
          </div>
        </main>

        <FloatingActions />
      </div>
    </div>
  );
}
