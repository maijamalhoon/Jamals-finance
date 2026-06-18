"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const supabase = createClient();
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
  }, [open, type]);

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
  const btnColor =
    isIncome ?
      "bg-green-600 hover:bg-green-700"
    : "bg-red-600 hover:bg-red-700";
  const btnLabel =
    loading ? "Saving…"
    : isEditing ? `Update ${isIncome ? "Income" : "Expense"}`
    : `Save ${isIncome ? "Income" : "Expense"}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border border-gray-800 text-white max-w-md p-0 gap-0">
        <DialogHeader className="p-5 border-b border-gray-800">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === t ?
                    t === "income" ?
                      "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : "text-gray-500 hover:text-white"
                }`}
              >
                {t === "income" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Amount (PKR)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-lg font-semibold outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
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
            <label className="text-gray-400 text-xs block mb-1.5">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
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
            <label className="text-gray-400 text-xs block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
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
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${btnColor}`}
          >
            {btnLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
