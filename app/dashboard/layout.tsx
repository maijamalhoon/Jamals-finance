import Header from "@/components/layout/Header";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";
import FloatingActions from "@/components/layout/FloatingActions";
import DashboardScrollRestoration from "@/components/motion/DashboardScrollRestoration";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="jf-dashboard-header-wrap hidden lg:block">
          <Header />
        </div>

        <MobileHeader />
        <DashboardScrollRestoration />

        <main
          data-dashboard-scroll
          className="jf-dashboard-scroll relative flex-1 overflow-y-auto overscroll-contain px-3 pb-[var(--jf-mobile-content-bottom)] pt-4 sm:px-5 sm:pb-[calc(var(--jf-mobile-content-bottom)+0.5rem)] sm:pt-5 lg:px-6 lg:pb-10 lg:pt-6 xl:px-7"
        >
          <div className="jf-dashboard-content-frame mx-auto w-full max-w-[1480px] min-w-0">
            {children}
          </div>
        </main>

        <MobileNav />
        <FloatingActions />
      </div>
    </div>
  );
}
