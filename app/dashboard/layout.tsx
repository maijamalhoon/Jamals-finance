import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#121318] text-white">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileHeader />

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
