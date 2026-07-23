"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Eye,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { PersistentSettingsCategory } from "@/components/settings/CategoryManagementExperience";
import CategoryVisualField from "@/components/settings/CategoryVisualField";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CategoryVisualIcon,
  getCategoryVisual,
  getNextCategoryVisual,
  type CategoryKind,
  type CategoryVisual,
} from "@/lib/category-visuals";
import {
  CATEGORY_DELETE_VERIFICATION_ERROR,
  validateCategoryDeleteReadiness,
} from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";

type CategoryDialogMode = "create" | "view" | null;

type Props = {
  initialCategories: PersistentSettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
};

const EMPTY_VISUAL: CategoryVisual = {
  color: "#2563EB",
  iconKey: "tags",
};

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="finance-icon-bubble h-11 w-11 rounded-full text-active">
      {children}
    </span>
  );
}

function CategoryActionRow({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="finance-focus flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover disabled:cursor-not-allowed disabled:opacity-55 sm:px-5"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-text-primary">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-text-secondary" />
    </button>
  );
}

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

export default function CategorySettingsSection({
  initialCategories,
  initialUsage,
  userId,
  available,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [usage, setUsage] = useState(initialUsage);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");

  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<CategoryKind>("income");
  const [draftVisual, setDraftVisual] = useState<CategoryVisual>(EMPTY_VISUAL);
  const [draftVisualTouched, setDraftVisualTouched] = useState(false);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editVisual, setEditVisual] = useState<CategoryVisual>(EMPTY_VISUAL);

  const [pendingDelete, setPendingDelete] =
    useState<PersistentSettingsCategory | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  useEffect(() => setUsage(initialUsage), [initialUsage]);

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

  const suggestedDraftVisual = useMemo(
    () => getNextCategoryVisual(categories, draftName || "Category", draftType),
    [categories, draftName, draftType],
  );
  const resolvedDraftVisual = draftVisualTouched
    ? draftVisual
    : suggestedDraftVisual;

  function openCreateDialog() {
    const type: CategoryKind = "income";
    setDraftName("");
    setDraftType(type);
    setDraftVisual(getNextCategoryVisual(categories, "Category", type));
    setDraftVisualTouched(false);
    setEditingId(null);
    setDialogMode("create");
  }

  function openViewDialog() {
    setEditingId(null);
    setDialogMode("view");
  }

  function closeMainDialog() {
    setDialogMode(null);
    setEditingId(null);
    setDraftName("");
    setDraftVisualTouched(false);
  }

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

    setSavingId("new");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        type: draftType,
        color: resolvedDraftVisual.color,
        icon_key: resolvedDraftVisual.iconKey,
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
    setActiveTab(created.type);
    closeMainDialog();
    toast.success(`${name} created with its saved emoji and color.`);
    router.refresh();
  }

  function startEdit(category: PersistentSettingsCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setEditVisual(getCategoryVisual(category));
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
        color: editVisual.color,
        icon_key: editVisual.iconKey,
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
    toast.success(`${name} and its visual memory were updated.`);
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
        <div className="rounded-[20px] border border-dashed border-border bg-surface-secondary px-5 py-8 text-center">
          <p className="text-sm font-bold text-text-primary">
            No {type} categories yet
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Categories of this type will appear here.
          </p>
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
                className="rounded-[20px] border border-active/30 bg-surface-secondary p-3 sm:p-4"
              >
                <CategoryVisualField
                  id={`edit-category-${category.id}`}
                  name={editName}
                  type={editType}
                  visual={editVisual}
                  onNameChange={setEditName}
                  onVisualChange={setEditVisual}
                  placeholder="Category name"
                  ariaLabel={`Edit ${category.name} name`}
                  disabled={savingId === category.id}
                />
                <div className="mt-3">
                  <TypeSelector
                    value={editType}
                    onChange={setEditType}
                    disabled={!canChangeType || savingId === category.id}
                  />
                </div>
                {!canChangeType ? (
                  <p className="mt-2 text-xs leading-5 text-text-secondary">
                    Type cannot change while this category is in use. Its name,
                    emoji and color can still be updated without affecting data.
                  </p>
                ) : null}
                <div className="mt-3 flex justify-end gap-2">
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

          return (
            <div
              key={category.id}
              className="rounded-[20px] border border-border bg-card p-3 transition-colors hover:border-active/25 hover:bg-hover sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CategoryVisualIcon category={category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-primary">
                    {category.name}
                  </p>
                  <p className="mt-1 truncate text-[11px] leading-4 text-text-secondary">
                    {parent ? `Under ${parent.name}` : "Top level"}
                    {` · ${usageCount} ${usageCount === 1 ? "transaction" : "transactions"}`}
                    {childCount > 0 ? ` · ${childCount} subcategories` : ""}
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
      <section className="mx-auto mt-5 max-w-4xl">
        <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          Categories
        </p>
        <div className="finance-panel min-w-0 overflow-hidden">
          <CategoryActionRow
            icon={
              <IconBubble>
                <Plus size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="Create Category"
            description={
              available
                ? "Add a new income or expense category"
                : "Category data is currently unavailable"
            }
            onClick={openCreateDialog}
            disabled={!available}
          />
          <div className="ml-[76px] h-px bg-border" />
          <CategoryActionRow
            icon={
              <IconBubble>
                <Eye size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="View Categories"
            description={
              available
                ? "View, edit, or delete saved categories"
                : "Category data is currently unavailable"
            }
            onClick={openViewDialog}
            disabled={!available}
          />
        </div>
      </section>

      <Dialog
        open={dialogMode !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) closeMainDialog();
        }}
      >
        <DialogContent
          className={`${financeModalContentClass} w-[calc(100vw-1rem)] ${
            dialogMode === "view"
              ? "sm:[--finance-modal-max-width:46rem]"
              : "sm:[--finance-modal-max-width:40rem]"
          }`}
        >
          <FinanceModalHeader
            title={dialogMode === "create" ? "Create category" : "Categories"}
            description={
              dialogMode === "view"
                ? "View, edit, or delete income and expense categories."
                : undefined
            }
            icon={dialogMode === "view" ? LayoutGrid : undefined}
            tone="info"
          />

          <FinanceModalBody>
            {dialogMode === "create" ? (
              <form onSubmit={addCategory} className="space-y-4">
                <FinanceFormField
                  label="Category name"
                  htmlFor="settings-category-name"
                >
                  <CategoryVisualField
                    id="settings-category-name"
                    name={draftName}
                    type={draftType}
                    visual={resolvedDraftVisual}
                    onNameChange={setDraftName}
                    onVisualChange={(visual) => {
                      setDraftVisual(visual);
                      setDraftVisualTouched(true);
                    }}
                    autoFocus
                  />
                </FinanceFormField>

                <div className="flex gap-3 rounded-[16px] border border-border bg-surface-secondary px-4 py-3.5">
                  <Lightbulb
                    size={20}
                    className="mt-0.5 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">
                    Categories keep transactions, reports, emoji and color together.
                    The selected visual is remembered everywhere without changing
                    any existing financial data.
                  </p>
                </div>

                <FinanceFormField label="Category type">
                  <TypeSelector value={draftType} onChange={setDraftType} />
                </FinanceFormField>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-text-secondary">
                    Permanent category memory
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!draftName.trim() || savingId === "new"}
                    className="w-full sm:w-auto"
                  >
                    {savingId === "new" ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Plus size={17} />
                    )}
                    {savingId === "new" ? "Creating..." : "Create category"}
                  </Button>
                </div>
              </form>
            ) : (
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
                <div className="mt-3 max-h-[min(62dvh,36rem)] overflow-y-auto overscroll-contain pr-1">
                  <TabsContent value="income" className="mt-0">
                    <CategoryList type="income" />
                  </TabsContent>
                  <TabsContent value="expense" className="mt-0">
                    <CategoryList type="expense" />
                  </TabsContent>
                </div>
              </Tabs>
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
