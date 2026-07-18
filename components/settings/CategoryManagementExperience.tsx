"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CategoryVisualIcon,
  getCategoryVisual,
  getNextCategoryVisual,
  type CategoryKind,
  type CategoryVisualSource,
} from "@/lib/category-visuals";
import {
  CATEGORY_DELETE_VERIFICATION_ERROR,
  validateCategoryDeleteReadiness,
} from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";

export interface PersistentSettingsCategory extends CategoryVisualSource {
  type: CategoryKind;
  color: string | null;
  icon_key: string | null;
  parent_id: string | null;
}

type CategoriesMode = "home" | "view" | "create";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategories: PersistentSettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
};

function TypeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: CategoryKind;
  onChange: (value: CategoryKind) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 rounded-[16px] border border-border bg-surface-secondary p-1"
      role="radiogroup"
      aria-label="Category type"
    >
      {(["income", "expense"] as const).map((type) => {
        const active = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-3 text-sm font-bold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? type === "income"
                  ? "bg-success text-[var(--status-foreground)] shadow-sm"
                  : "bg-danger text-[var(--status-foreground)] shadow-sm"
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
          >
            {active ? <Check size={15} aria-hidden="true" /> : null}
            {type}
          </button>
        );
      })}
    </div>
  );
}

function ModeBackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="mb-3">
      <ArrowLeft size={15} /> Back
    </Button>
  );
}

export default function CategoryManagementExperience({
  open,
  onOpenChange,
  initialCategories,
  initialUsage,
  userId,
  available,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<CategoriesMode>("home");
  const [categories, setCategories] = useState(initialCategories);
  const [usage, setUsage] = useState(initialUsage);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<CategoryKind>("income");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [pendingDelete, setPendingDelete] =
    useState<PersistentSettingsCategory | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  useEffect(() => setUsage(initialUsage), [initialUsage]);
  useEffect(() => {
    if (!open) return;
    setMode("home");
    setDraftName("");
    setEditingId(null);
    setPendingDelete(null);
    setDeleteFeedback(null);
  }, [open]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const childCountByParent = useMemo(
    () =>
      categories.reduce<Record<string, number>>((counts, category) => {
        if (category.parent_id) {
          counts[category.parent_id] = (counts[category.parent_id] ?? 0) + 1;
        }
        return counts;
      }, {}),
    [categories],
  );
  const draftVisual = useMemo(
    () => getNextCategoryVisual(categories, draftName || "Category", draftType),
    [categories, draftName, draftType],
  );

  function hasDuplicateName(
    name: string,
    type: CategoryKind,
    excludeId?: string,
  ) {
    const normalized = name.trim().toLowerCase();
    return categories.some(
      (category) =>
        category.id !== excludeId &&
        category.type === type &&
        category.name.trim().toLowerCase() === normalized,
    );
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, draftType)) {
      toast.error(`${name} already exists in ${draftType} categories.`);
      return;
    }

    const visual = getNextCategoryVisual(categories, name, draftType);
    setSavingId("new");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        type: draftType,
        color: visual.color,
        icon_key: visual.iconKey,
        parent_id: null,
      })
      .select("id, name, type, color, icon_key, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error("Could not create category. Please try again.");
      return;
    }

    const created = data as PersistentSettingsCategory;
    setCategories((current) => [...current, created]);
    setUsage((current) => ({ ...current, [created.id]: 0 }));
    setDraftName("");
    setActiveTab(created.type);
    setMode("view");
    toast.success(`${name} created with its own color and icon.`);
    router.refresh();
  }

  function startEdit(category: PersistentSettingsCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function updateCategory(category: PersistentSettingsCategory) {
    const name = editName.trim();
    const usageCount = usage[category.id] ?? 0;
    const childCount = childCountByParent[category.id] ?? 0;
    const canChangeType = usageCount === 0 && childCount === 0;
    const nextType = canChangeType ? editType : category.type;

    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, nextType, category.id)) {
      toast.error(`${name} already exists in ${nextType} categories.`);
      return;
    }

    setSavingId(category.id);
    const { data, error } = await supabase
      .from("categories")
      .update({
        name,
        type: nextType,
        parent_id: nextType === "income" ? null : category.parent_id,
      })
      .eq("id", category.id)
      .eq("user_id", userId)
      .select("id, name, type, color, icon_key, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error("Could not update category. Please try again.");
      return;
    }

    const updated = data as PersistentSettingsCategory;
    setCategories((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setActiveTab(updated.type);
    cancelEdit();
    toast.success(`${name} updated. Its color and icon stayed unchanged.`);
    router.refresh();
  }

  function requestCategoryDelete(category: PersistentSettingsCategory) {
    const readiness = validateCategoryDeleteReadiness({
      usageCount: usage[category.id] ?? 0,
      childCount: childCountByParent[category.id] ?? 0,
    });
    if (!readiness.ok) {
      toast.error(readiness.error);
      return;
    }
    setDeleteFeedback(null);
    setPendingDelete(category);
  }

  async function confirmCategoryDelete() {
    const category = pendingDelete;
    if (!category || isDeletingCategory) return;
    setIsDeletingCategory(true);
    setDeleteFeedback(null);

    try {
      const [usageResult, childResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("category_id", category.id),
        supabase
          .from("categories")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("parent_id", category.id),
      ]);

      const readiness = validateCategoryDeleteReadiness({
        usageCount: usageResult.error ? null : usageResult.count,
        childCount: childResult.error ? null : childResult.count,
      });
      if (!readiness.ok) {
        if (readiness.error === CATEGORY_DELETE_VERIFICATION_ERROR) {
          setDeleteFeedback(CATEGORY_DELETE_VERIFICATION_ERROR);
          return;
        }
        toast.error(readiness.error);
        setPendingDelete(null);
        router.refresh();
        return;
      }

      const { data: deletedCategory, error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (deleteError || !deletedCategory) {
        setDeleteFeedback("Could not delete category. Please try again.");
        return;
      }

      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
      setUsage((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      setPendingDelete(null);
      toast.success(`${category.name} removed.`);
      router.refresh();
    } catch {
      setDeleteFeedback("Could not verify or delete category. Please try again.");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  function CategoryList({ type }: { type: CategoryKind }) {
    const items = categories
      .filter((category) => category.type === type)
      .sort((left, right) => left.name.localeCompare(right.name));

    if (items.length === 0) {
      return (
        <div className="rounded-[22px] border border-dashed border-border bg-surface-secondary px-5 py-10 text-center">
          <Tags className="mx-auto h-7 w-7 text-text-tertiary" />
          <p className="mt-3 text-sm font-bold text-text-primary">
            No {type} categories yet
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={() => {
              setDraftType(type);
              setMode("create");
            }}
          >
            <Plus size={15} /> Create category
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((category) => {
          const usageCount = usage[category.id] ?? 0;
          const childCount = childCountByParent[category.id] ?? 0;
          const parent = category.parent_id
            ? categoryById.get(category.parent_id)
            : null;
          const canChangeType = usageCount === 0 && childCount === 0;

          if (editingId === category.id) {
            return (
              <div
                key={category.id}
                className="rounded-[22px] border border-active/30 bg-surface-secondary p-3 sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryVisualIcon category={category} size="sm" />
                  <Input
                    value={editName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setEditName(event.target.value)
                    }
                    aria-label={`Edit ${category.name} name`}
                    className="min-w-0 flex-1"
                  />
                </div>
                <div className="mt-3">
                  <TypeSelector
                    value={editType}
                    onChange={setEditType}
                    disabled={!canChangeType}
                  />
                </div>
                {!canChangeType ? (
                  <p className="mt-2 text-xs leading-5 text-text-secondary">
                    Type remains locked while transactions or subcategories use this category.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-2 min-[390px]:flex-row min-[390px]:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={savingId === category.id}
                  >
                    <X size={14} /> Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void updateCategory(category)}
                    disabled={savingId === category.id || !editName.trim()}
                  >
                    {savingId === category.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            );
          }

          const visual = getCategoryVisual(category);
          return (
            <div
              key={category.id}
              className="group rounded-[22px] border border-border bg-card p-3 transition-colors hover:border-active/25 hover:bg-hover sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CategoryVisualIcon category={category} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-bold text-text-primary">
                      {category.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                        category.type === "income"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {category.type}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] leading-4 text-text-secondary">
                    {parent ? `Under ${parent.name}` : "Top level"}
                    {` · ${usageCount} ${usageCount === 1 ? "transaction" : "transactions"}`}
                    {childCount > 0 ? ` · ${childCount} subcategories` : ""}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                    Visual locked · {visual.color}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => startEdit(category)}
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => requestCategoryDelete(category)}
                    aria-label={`Delete ${category.name}`}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`${financeModalContentClass} w-[calc(100vw-1rem)] sm:[--finance-modal-max-width:46rem]`}
        >
          <FinanceModalHeader
            title="Categories"
            description="Manage saved categories or create a new one with an automatic permanent color and icon."
            icon={Tags}
            tone="info"
          />
          <FinanceModalBody>
            {!available ? (
              <div className="rounded-[22px] border border-danger/25 bg-danger/5 p-4">
                <p className="text-sm font-bold text-danger">
                  Category data is unavailable
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Nothing has been changed. Close this window and refresh before trying again.
                </p>
              </div>
            ) : mode === "home" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="finance-focus group rounded-[24px] border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-active/30 hover:bg-hover hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="finance-icon-bubble h-12 w-12 text-active">
                    <Eye size={22} />
                  </span>
                  <span className="mt-4 block text-base font-extrabold text-text-primary">
                    View Categories
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-text-secondary">
                    Review all existing income and expense categories, their usage, color, and icon.
                  </span>
                  <span className="mt-4 block text-xs font-bold text-active">
                    {categories.length} saved categories
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className="finance-focus group rounded-[24px] border border-active/25 bg-active/5 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-active/40 hover:bg-active/10 hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="finance-icon-bubble h-12 w-12 text-active">
                    <Plus size={22} />
                  </span>
                  <span className="mt-4 block text-base font-extrabold text-text-primary">
                    Create Category
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-text-secondary">
                    Enter a name, choose income or expense, and create. The visual is assigned automatically.
                  </span>
                  <span className="mt-4 block text-xs font-bold text-active">
                    Simple three-step creation
                  </span>
                </button>
              </div>
            ) : mode === "create" ? (
              <div>
                <ModeBackButton onClick={() => setMode("home")} />
                <form
                  onSubmit={addCategory}
                  className="rounded-[24px] border border-active/20 bg-surface-secondary p-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryVisualIcon
                      color={draftVisual.color}
                      iconKey={draftVisual.iconKey}
                      label={draftName || `New ${draftType}`}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-extrabold text-text-primary">
                        Create a category
                      </p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">
                        This color and icon will stay attached to the category everywhere.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <FinanceFormField
                      label="Category name"
                      htmlFor="persistent-category-name"
                    >
                      <Input
                        id="persistent-category-name"
                        value={draftName}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setDraftName(event.target.value)
                        }
                        placeholder="e.g. Salary, Rent, Fuel"
                        autoComplete="off"
                      />
                    </FinanceFormField>
                    <FinanceFormField label="Type">
                      <TypeSelector
                        value={draftType}
                        onChange={setDraftType}
                      />
                    </FinanceFormField>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!draftName.trim() || savingId === "new"}
                      className="w-full"
                    >
                      {savingId === "new" ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Plus size={17} />
                      )}
                      {savingId === "new" ? "Creating..." : "Create Category"}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <ModeBackButton onClick={() => setMode("home")} />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setDraftType(activeTab);
                      setMode("create");
                    }}
                  >
                    <Plus size={15} /> Create Category
                  </Button>
                </div>
                <Tabs
                  value={activeTab}
                  onValueChange={(value: string) => {
                    setActiveTab(value as CategoryKind);
                    cancelEdit();
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">
                      Income ({categories.filter((item) => item.type === "income").length})
                    </TabsTrigger>
                    <TabsTrigger value="expense">
                      Expense ({categories.filter((item) => item.type === "expense").length})
                    </TabsTrigger>
                  </TabsList>
                  <div className="mt-3 max-h-[min(58dvh,34rem)] overflow-y-auto overscroll-contain pr-1">
                    <TabsContent value="income" className="mt-0">
                      <CategoryList type="income" />
                    </TabsContent>
                    <TabsContent value="expense" className="mt-0">
                      <CategoryList type="expense" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}
          </FinanceModalBody>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !isDeletingCategory) {
            setPendingDelete(null);
            setDeleteFeedback(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
            <DialogDescription>
              Deletion is allowed only when no transaction or subcategory uses it.
            </DialogDescription>
          </DialogHeader>
          {deleteFeedback ? (
            <p role="alert" className="text-xs font-semibold text-danger">
              {deleteFeedback}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                setDeleteFeedback(null);
              }}
              disabled={isDeletingCategory}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmCategoryDelete()}
              disabled={isDeletingCategory}
              className="bg-danger text-[var(--status-foreground)] hover:bg-danger/90"
            >
              {isDeletingCategory ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {isDeletingCategory ? "Verifying..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
