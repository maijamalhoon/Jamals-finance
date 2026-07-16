"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getAppDateKey } from "@/lib/dates";
import { BASE_CURRENCY } from "@/lib/currency";

export default function ExportButton() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name), accounts(name)")
        .order("date", { ascending: false });

      if (error || !data) {
        throw new Error("Export data unavailable");
      }

      const rows = [
        ["Date", "Type", "Category", "Account", `Amount (${BASE_CURRENCY})`, "Note"],
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
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `jamals-finance-${getAppDateKey()}.csv`;
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Could not export transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleExport}
      loading={loading}
      loadingLabel="Exporting…"
      variant="outline"
      className="finance-control"
    >
      <Download size={15} />
      Export CSV
    </Button>
  );
}
