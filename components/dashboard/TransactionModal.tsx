"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import AccountSelect from "@/components/accounts/AccountSelect";
import { getAppDateKey } from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
  color: string | null;
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

interface CategoryOption {
  category: Category;
  color: string;
  label: string;
  parentLabel?: string;
  depth: number;
}

const CATEGORY_FALLBACK_COLORS: Record<Category["type"], string> = {
  income: "#22c55e",
  expense: "#f59e0b",
};

function getCategoryColor(category: Category) {
  return category.color || CATEGORY_FALLBACK_COLORS[category.type];
}

function CategorySwatch({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-full border border-white/50 shadow-[0_0_0_1px_rgb(0_0_0_/_0.08)] dark:border-white/10 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}

function CategorySummary({
  option,
  placeholder,
}: {
  option?: CategoryOption;
  placeholder: string;
}) {
  if (!option) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3 text-text-secondary">
        <CategorySwatch color="#94a3b8" className="h-3 w-3" />
        <span className="truncate">{placeholder}</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <CategorySwatch color={option.color} className="h-3 w-3" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {option.label}
        </span>
        <span className="block truncate text-[11px] font-medium text-text-secondary">
          {option.parentLabel ? "Child category" : "Parent category"}
        </span>
      </span>
    </span>
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
  const [date, setDate] = useState(getAppDateKey());
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
      setDate(getAppDateKey());
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

    if (!date) {
      setError("Enter a valid date as DD/MM/YYYY.");
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
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const sortedCategories = [...categories].sort((first, second) =>
      first.name.localeCompare(second.name),
    );
    const childrenByParent = sortedCategories.reduce<Record<string, Category[]>>(
      (grouped, category) => {
        if (!category.parent_id) return grouped;
        const parent = categoryById.get(category.parent_id);
        if (!parent || parent.type !== category.type) return grouped;

        grouped[category.parent_id] = [
          ...(grouped[category.parent_id] ?? []),
          category,
        ];
        return grouped;
      },
      {},
    );
    const roots = sortedCategories.filter((category) => {
      if (!category.parent_id) return true;
      const parent = categoryById.get(category.parent_id);
      return !parent || parent.type !== category.type;
    });

    return roots.flatMap((category) => {
      const rootOption: CategoryOption = {
        category,
        color: getCategoryColor(category),
        label: category.name,
        depth: 0,
      };
      const childOptions = (childrenByParent[category.id] ?? []).map((child) => ({
        category: child,
        color: getCategoryColor(child),
        label: `${category.name} / ${child.name}`,
        parentLabel: category.name,
        depth: 1,
      }));

      return [rootOption, ...childOptions];
    });
  }, [categories, categoryById]);
  const selectedCategoryOption = categoryOptions.find(
    (option) => option.category.id === categoryId,
  );
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
                  aria-pressed={type === nextType}
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
            <label className="field-label" htmlFor="transaction-amount">
              Amount (PKR)
            </label>
            <input
              id="transaction-amount"
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
            <label className="field-label" htmlFor="transaction-category">
              Category
            </label>
            <Select
              value={categoryId || undefined}
              onValueChange={setCategoryId}
              disabled={loadingOptions || categoryOptions.length === 0}
            >
              <SelectTrigger
                id="transaction-category"
                aria-label={`${isIncome ? "Income" : "Expense"} category`}
                aria-describedby="transaction-category-help"
                className="field-input h-auto min-h-12 w-full gap-3 px-3 py-2 pr-3 text-left data-placeholder:text-text-secondary [&>svg]:ml-1"
              >
                <CategorySummary
                  option={selectedCategoryOption}
                  placeholder={
                    loadingOptions
                      ? "Loading categories..."
                      : `Select ${isIncome ? "income" : "expense"} category`
                  }
                />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={8}
                className="z-[90] max-h-[min(20rem,var(--radix-select-content-available-height))] rounded-[18px] p-1.5"
                style={{
                  width: "var(--radix-select-trigger-width)",
                  maxWidth: "calc(100vw - 1.5rem)",
                }}
              >
                {categoryOptions.map((option) => (
                  <SelectItem
                    key={option.category.id}
                    value={option.category.id}
                    textValue={option.label}
                    className="min-h-14 py-2 pr-8 pl-2.5"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <CategorySwatch color={option.color} className="h-3 w-3" />
                      <span
                        className="min-w-0 flex-1"
                        style={{ paddingLeft: option.depth ? "0.75rem" : 0 }}
                      >
                        <span className="block truncate text-sm font-semibold">
                          {option.label}
                        </span>
                        <span className="block truncate text-[11px] text-text-secondary">
                          {option.parentLabel
                            ? `Under ${option.parentLabel}`
                            : "Parent category"}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div id="transaction-category-help" className="mt-2">
              {!loadingOptions && categoryOptions.length === 0 ? (
                <div className="rounded-[var(--oneui-control-radius)] border border-border bg-surface-secondary px-3 py-2.5 text-sm leading-5 text-text-secondary">
                  <p>
                    No {isIncome ? "income" : "expense"} categories yet.
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="finance-focus mt-1 inline-flex rounded-md text-sm font-semibold text-active hover:underline"
                    onClick={onClose}
                  >
                    Open Settings categories
                  </Link>
                </div>
              ) : (
                <p className="sr-only">
                  Category options include color markers and parent or child
                  labels. Selected items are also marked with a check.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="transaction-date">
              Date
            </label>
            <DatePicker
              id="transaction-date"
              value={date}
              onChange={setDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Transaction date"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="transaction-note">
              Note (Optional)
            </label>
            <input
              id="transaction-note"
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
