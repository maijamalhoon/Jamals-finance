"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import PageHeadingActionPortal from "@/components/layout/PageHeadingActionPortal";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getAppDateKey } from "@/lib/dates";
import { BASE_CURRENCY } from "@/lib/currency";
import { serializeCsv } from "@/lib/csv";
import { downloadBlob } from "@/lib/client-download";

export default function ExportButton({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);

    try {
      let transactionsQuery = supabase
          .from("transactions")
          .select("id, type, amount, date, note, reference, created_at, categories(name), accounts(name)")
          .order("date", { ascending: false });
      let transfersQuery = supabase
          .from("account_transfers")
          .select(
            "id, amount, transfer_date, note, reference, created_at, from_account:from_account_id(name), to_account:to_account_id(name)",
          )
          .order("transfer_date", { ascending: false });

      if (from) {
        transactionsQuery = transactionsQuery.gte("date", from);
        transfersQuery = transfersQuery.gte("transfer_date", from);
      }
      if (to) {
        transactionsQuery = transactionsQuery.lte("date", to);
        transfersQuery = transfersQuery.lte("transfer_date", to);
      }

      const [transactionsResult, transfersResult] = await Promise.all([
        transactionsQuery,
        transfersQuery,
      ]);

      if (
        transactionsResult.error ||
        transfersResult.error ||
        !transactionsResult.data ||
        !transfersResult.data
      ) {
        throw new Error("Export data unavailable");
      }

      const relationName = (
        relation: { name?: string } | { name?: string }[] | null,
      ) => {
        const row = Array.isArray(relation) ? relation[0] : relation;
        return row?.name || "";
      };

      const activity = [
        ...transactionsResult.data.map((transaction) => ({
          id: transaction.id,
          date: transaction.date,
          createdAt: transaction.created_at,
          type: transaction.type,
          category: relationName(transaction.categories),
          account: relationName(transaction.accounts),
          amount: transaction.amount,
          note: transaction.note || "",
          reference: transaction.reference || "",
        })),
        ...transfersResult.data.map((transfer) => ({
          id: transfer.id,
          date: transfer.transfer_date,
          createdAt: transfer.created_at,
          type: "transfer",
          category: "Transfer",
          account: `${relationName(transfer.from_account) || "From account"} -> ${relationName(transfer.to_account) || "To account"}`,
          amount: transfer.amount,
          note: transfer.note || "",
          reference: transfer.reference || "",
        })),
      ].sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);
        if (dateOrder !== 0) return dateOrder;

        const createdOrder = String(right.createdAt ?? "").localeCompare(
          String(left.createdAt ?? ""),
        );
        return createdOrder !== 0 ? createdOrder : right.id.localeCompare(left.id);
      });

      const rows = [
        ["Date", "Type", "Category", "Account", `Amount (${BASE_CURRENCY})`, "Reference", "Note"],
        ...activity.map((entry) => [
          entry.date,
          entry.type,
          entry.category,
          entry.account,
          entry.amount,
          entry.reference,
          entry.note,
        ]),
      ];

      const csv = serializeCsv(rows);
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      const rangeSuffix = from && to ? `${from}-to-${to}` : getAppDateKey();
      downloadBlob(blob, `jamals-finance-${rangeSuffix}.csv`);
      toast.success("Export downloaded");
    } catch {
      toast.error("Could not export transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageHeadingActionPortal page="reports" force>
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
    </PageHeadingActionPortal>
  );
}
