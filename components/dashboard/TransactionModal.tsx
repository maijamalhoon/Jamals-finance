"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
}
interface Account {
  id: string;
  name: string;
  type: string;
}

export interface ExistingTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category_id: string;
  account_id: string;
  date: string;
  note: string | null;
}

interface Props {
  open: boolean;
  defaultType: "income" | "expense";
  onClose: () => void;
  onSuccess: () => void;
  transaction?: ExistingTransaction;
}

export default function TransactionModal({
  open,
  defaultType,
  onClose,
  onSuccess,
  transaction,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!transaction;

  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDate(transaction.date);
      setNote(transaction.note || "");
    } else {
      setType(defaultType);
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
    }
    setError("");
  }, [open, transaction, defaultType]);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [{ data: cats }, { data: accs }] = await Promise.all([
        supabase.from("categories").select("*").eq("type", type).order("name"),
        supabase.from("accounts").select("*").order("name"),
      ]);
      setCategories(cats || []);
      setAccounts(accs || []);
      setCategoryId(transaction?.category_id || cats?.[0]?.id || "");
      setAccountId(transaction?.account_id || accs?.[0]?.id || "");
    }
    load();
  }, [open, supabase, transaction?.account_id, transaction?.category_id, type]);

  async function handleSave() {
    if (!amount || !categoryId || !accountId) {
      setError("Please fill in all fields.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Not logged in. Please sign in again.");
      toast.error("Please sign in again");
      setLoading(false);
      return;
    }

    const payload = {
      user_id: user.id,
      type,
      amount: parsedAmount,
      category_id: categoryId,
      account_id: accountId,
      date,
      note: note.trim() || null,
    };

    const { error: saveError } =
      isEditing ?
        await supabase
          .from("transactions")
          .update(payload)
          .eq("id", transaction!.id)
      : await supabase.from("transactions").insert(payload);

    setLoading(false);

    if (saveError) {
      setError(`Error: ${saveError.message}`);
      toast.error("Failed to save transaction");
    } else {
      setAmount("");
      setNote("");
      setError("");
      toast.success(isEditing ? "Transaction updated!" : "Transaction saved!");
      onSuccess();
    }
  }

  const isIncome = type === "income";
  const btnLabel =
    loading ? "Saving..."
    : isEditing ? `Update ${isIncome ? "Income" : "Expense"}`
    : `Save ${isIncome ? "Income" : "Expense"}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="finance-glass-panel max-w-md gap-0 p-0 text-white">
        <DialogHeader className="border-b border-white/[0.08] p-5">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-1">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  type === t ?
                    t === "income" ?
                      "bg-emerald-300 text-slate-950"
                    : "bg-rose-300 text-slate-950"
                  : "text-slate-500 hover:text-white"
                }`}
              >
                {t === "income" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="field-label">Amount (PKR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="field-input text-lg font-semibold"
            />
          </div>

          {/* Category */}
          <div>
            <label className="field-label">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="field-input"
              style={{ colorScheme: "dark" }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="field-label">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="field-input"
              style={{ colorScheme: "dark" }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="field-label">Date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select transaction date"
            />
          </div>

          {/* Note */}
          <div>
            <label className="field-label">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="field-input"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 ${isIncome ? "success-action" : "danger-action"}`}
          >
            {btnLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
