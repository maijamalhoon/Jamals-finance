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
import { INCOME_SOURCE_SUGGESTIONS } from "@/lib/finance-options";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
  parent_id?: string | null;
  parent?: { name: string } | { name: string }[] | null;
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
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
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
  const [sourceName, setSourceName] = useState("");
  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
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
      setSourceName(transaction.source_name || "");
      setPersonName(transaction.person_name || "");
      setItemName(transaction.item_name || "");
    } else {
      setType(defaultType);
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setSourceName("");
      setPersonName("");
      setItemName("");
    }
    setError("");
  }, [open, transaction, defaultType]);

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [{ data: cats }, { data: accs }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, color, parent_id, parent:categories!categories_parent_id_fkey(name)")
          .eq("type", type)
          .order("parent_id", { ascending: true, nullsFirst: true })
          .order("name"),
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
      source_name: type === "income" ? sourceName.trim() || null : null,
      person_name: personName.trim() || null,
      item_name: itemName.trim() || null,
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
  const parentName = (category: Category) =>
    Array.isArray(category.parent) ?
      category.parent[0]?.name
    : category.parent?.name;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="finance-glass-panel max-w-lg gap-0 p-0 text-white">
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
            <label className="field-label">
              {isIncome ? "Income Source Category" : "Expense Category"}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="field-input"
              style={{ colorScheme: "dark" }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {parentName(c) ? `${parentName(c)} / ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>

          {isIncome && (
            <div>
              <label className="field-label">Exact Income Source</label>
              <input
                list="income-source-suggestions"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="inDrive rides, Toyota commission, salary..."
                className="field-input"
              />
              <datalist id="income-source-suggestions">
                {INCOME_SOURCE_SUGGESTIONS.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
            </div>
          )}

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Person Name (Optional)</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Related person"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Item Name (Optional)</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item, job, project"
                className="field-input"
              />
            </div>
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
