import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";
import FloatingActions from "@/components/layout/FloatingActions";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f7fb] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),transparent_19rem),linear-gradient(135deg,rgba(219,234,254,0.62),transparent_30%),linear-gradient(315deg,rgba(240,253,244,0.48),transparent_26%)]" />
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileHeader />

        <main className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <MobileNav />
        <FloatingActions />
      </div>
    </div>
  );
}
