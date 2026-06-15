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
    <div className="flex h-screen bg-[#0B0D17] overflow-hidden">
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>

        {/* Desktop bottom bar — Add Income / Add Expense */}
        <div className="hidden lg:block">
          <BottomBar />
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>
    </div>
  );
}
