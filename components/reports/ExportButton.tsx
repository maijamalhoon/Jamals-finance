"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ExportButton() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);

    const { data } = await supabase
      .from("transactions")
      .select("*, categories(name), accounts(name)")
      .order("date", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
    }

    const rows = [
      ["Date", "Type", "Category", "Account", "Amount (PKR)", "Note"],
      ...data.map((t) => [
        t.date,
        t.type,
        (t.categories as any)?.name || "",
        (t.accounts as any)?.name || "",
        t.amount,
        t.note || "",
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jamals-finance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700/50 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
    >
      <Download size={15} />
      {loading ? "Exporting…" : "Export CSV"}
    </button>
  );
}
