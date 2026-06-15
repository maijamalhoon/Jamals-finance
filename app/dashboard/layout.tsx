import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomBar from "@/components/dashboard/BottomBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#0B0D17] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <BottomBar />
      </div>
    </div>
  );
}
