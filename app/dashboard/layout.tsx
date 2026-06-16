import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";
import BottomBar from "@/components/dashboard/BottomBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0D17] text-white">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Mobile header */}
        <MobileHeader />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        {/* Desktop bottom bar */}
        <div className="hidden lg:block">
          <BottomBar />
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
