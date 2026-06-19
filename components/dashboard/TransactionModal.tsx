"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Check, ChevronDown, Search } from "lucide-react";

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

interface PickerOption {
  value: string;
  label: string;
  meta?: string;
  color?: string;
}

function OptionPicker({
  value,
  options,
  placeholder,
  emptyLabel,
  onChange,
}: {
  value: string;
  options: PickerOption[];
  placeholder: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.meta ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="field-input finance-focus flex items-center justify-between gap-3 pr-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.color && (
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: selected.color }}
            />
          )}
          <span className={selected ? "truncate text-white" : "text-slate-500"}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[170] w-full min-w-[280px] overflow-hidden rounded-[26px] border border-white/[0.13] bg-[#171b23]/96 p-2 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-white/[0.08] bg-white/[0.065] px-3 py-2">
            <Search size={14} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto pr-1" role="listbox">
            {filtered.length === 0 ? (
              <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.045] px-3 py-4 text-center text-xs text-slate-500">
                {emptyLabel}
              </div>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`finance-focus flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-white text-[#111318]"
                        : "text-slate-300 hover:bg-white/[0.075] hover:text-white"
                    }`}
                    role="option"
                    aria-selected={active}
                  >
                    {option.color && (
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: option.color }}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {option.label}
                      </span>
                      {option.meta && (
                        <span
                          className={`block truncate text-[11px] ${
                            active ? "text-slate-600" : "text-slate-500"
                          }`}
                        >
                          {option.meta}
                        </span>
                      )}
                    </span>
                    {active && <Check size={15} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: parentName(category) ? `${parentName(category)} / ${category.name}` : category.name,
    meta: isIncome ? "Income category" : "Expense category",
    color: category.color,
  }));
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    meta: account.type,
  }));

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
            <OptionPicker
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              placeholder={isIncome ? "Choose income category" : "Choose expense category"}
              emptyLabel="No categories found. Add them from Settings."
            />
          </div>

          {isIncome && (
            <div>
              <label className="field-label">Exact Income Source</label>
              <input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="inDrive rides, Toyota commission, salary..."
                className="field-input"
              />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {INCOME_SOURCE_SUGGESTIONS.slice(0, 8).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setSourceName(source)}
                    className={`finance-focus flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      sourceName === source
                        ? "border-white bg-white text-[#111318]"
                        : "border-white/[0.10] bg-white/[0.055] text-slate-400 hover:bg-white/[0.09] hover:text-white"
                    }`}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account */}
          <div>
            <label className="field-label">Account</label>
            <OptionPicker
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder="Choose receiving/payment account"
              emptyLabel="No accounts found. Add an account first."
            />
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
