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
    <div className="flex h-dvh overflow-hidden bg-[#0d1118] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18rem),linear-gradient(135deg,rgba(125,211,252,0.08),transparent_28%),linear-gradient(315deg,rgba(167,139,250,0.07),transparent_24%)]" />
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
