"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAppDateKey } from "@/lib/dates";

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
        (t.categories as { name?: string } | null)?.name || "",
        (t.accounts as { name?: string } | null)?.name || "",
        t.amount,
        t.note || "",
      ]),
    ];

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jamals-finance-${getAppDateKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="finance-control finance-focus flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-primary disabled:opacity-50"
    >
      <Download size={15} />
      {loading ? "Exporting..." : "Export CSV"}
    </button>
  );
}
