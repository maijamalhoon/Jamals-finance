import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";
import BottomBar from "@/components/dashboard/BottomBar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: todayTxns } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("date", todayStr);

  const todayIncome = (todayTxns ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const todayExpenses = (todayTxns ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0D17] text-white">
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar todayIncome={todayIncome} todayExpenses={todayExpenses} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="hidden lg:block">
          <Header />
        </div>

        <MobileHeader />

        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-7 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <div className="hidden lg:block">
          <BottomBar />
        </div>

        <MobileNav />
      </div>
    </div>
  );
}
