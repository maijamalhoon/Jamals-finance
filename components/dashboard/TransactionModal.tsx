"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import AccountSelect from "@/components/accounts/AccountSelect";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  parent_id?: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
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
  const [loadingOptions, setLoadingOptions] = useState(false);
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
      setLoadingOptions(true);
      setError("");
      const [{ data: cats, error: catsError }, { data: accs, error: accsError }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, type, color, parent_id")
          .eq("type", type)
          .order("parent_id", { ascending: true, nullsFirst: true })
          .order("name"),
        supabase.from("accounts").select("id, name, type, balance").order("name"),
      ]);
      setLoadingOptions(false);

      if (catsError || accsError) {
        setCategories([]);
        setAccounts([]);
        setCategoryId("");
        setAccountId("");
        setError(catsError?.message || accsError?.message || "Could not load options.");
        return;
      }

      const nextCategories = (cats || []) as Category[];
      const nextAccounts = (accs || []) as Account[];
      setCategories(nextCategories);
      setAccounts(nextAccounts);
      setCategoryId((current) => {
        const preferred = transaction?.category_id || current;
        return nextCategories.some((category) => category.id === preferred)
          ? preferred
          : nextCategories[0]?.id || "";
      });
      setAccountId((current) => {
        const preferred = transaction?.account_id || current;
        return nextAccounts.some((account) => account.id === preferred)
          ? preferred
          : nextAccounts[0]?.id || "";
      });
    }

    load();
  }, [open, supabase, transaction?.account_id, transaction?.category_id, type]);

  async function handleSave() {
    if (loadingOptions) {
      setError("Please wait while categories and accounts load.");
      return;
    }

    if (!amount || !categoryId || !accountId) {
      setError("Please fill in all required fields.");
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

    const { error: saveError } = isEditing
      ? await supabase.from("transactions").update(payload).eq("id", transaction!.id)
      : await supabase.from("transactions").insert(payload);

    setLoading(false);

    if (saveError) {
      setError(`Error: ${saveError.message}`);
      toast.error("Failed to save transaction");
      return;
    }

    setAmount("");
    setNote("");
    setError("");
    toast.success(isEditing ? "Transaction updated!" : "Transaction saved!");
    onSuccess();
  }

  const isIncome = type === "income";
  const btnLabel =
    loading ? "Saving..."
    : isEditing ? `Update ${isIncome ? "Income" : "Expense"}`
    : `Save ${isIncome ? "Income" : "Expense"}`;
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const parentName = (category: Category) =>
    category.parent_id ? categoryById.get(category.parent_id)?.name : undefined;
  const typeLocked = !isEditing;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title={isEditing ? "Edit Transaction" : `Add ${isIncome ? "Income" : "Expense"}`}
          description="Enter amount, account, category, date, and an optional note."
          icon={isIncome ? TrendingUp : TrendingDown}
          tone={isIncome ? "success" : "danger"}
          badge={
            typeLocked ? (
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isIncome
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                }`}
              >
                {isIncome ? "Income only" : "Expense only"}
              </span>
            ) : null
          }
        />

        <FinanceModalBody>
          {!typeLocked && (
            <div className="flex gap-1.5 rounded-[16px] border border-border bg-surface-secondary p-1">
              {(["income", "expense"] as const).map((nextType) => (
                <button
                  key={nextType}
                  type="button"
                  onClick={() => setType(nextType)}
                  className={`flex-1 rounded-[12px] py-2 text-sm font-semibold transition-colors ${
                    type === nextType
                      ? nextType === "income"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-200"
                      : "text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  {nextType === "income" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="field-label">Amount (PKR)</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="field-input text-lg font-semibold"
            />
          </div>

          <div>
            <label className="field-label">Account</label>
            <AccountSelect
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
            />
          </div>

          <div>
            <label className="field-label">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="field-input"
            >
              {loadingOptions && <option value="">Loading categories...</option>}
              {!loadingOptions && categories.length === 0 && (
                <option value="">
                  No {isIncome ? "income" : "expense"} categories found
                </option>
              )}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {parentName(category)
                    ? `${parentName(category)} / ${category.name}`
                    : category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Date</label>
            <DatePicker
              value={date}
              onChange={setDate}
              placeholder="Select transaction date"
            />
          </div>

          <div>
            <label className="field-label">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was this for?"
              className="field-input"
            />
          </div>

          {error && (
            <p className={financeErrorClass}>
              {error}
            </p>
          )}
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || loadingOptions}
            className={`py-3 ${isIncome ? "success-action" : "danger-action"}`}
          >
            {loadingOptions ? "Loading..." : btnLabel}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
