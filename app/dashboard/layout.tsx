import Sidebar from "@/components/layout/Sidebar";
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
    <div className="flex h-dvh overflow-hidden bg-transparent text-foreground">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileHeader />

        <DashboardScrollRestoration />

        <main
          data-dashboard-scroll
          className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-7"
        >
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <MobileNav />
        <FloatingActions />
      </div>
    </div>
  );
}
