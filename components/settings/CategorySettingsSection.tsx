"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  ChevronRight,
  Eye,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

type CategoryDialogMode = "create" | "manage" | null;
type SortMode = "az" | "used" | "newest";

type Props = {
  initialCategories: PersistentSettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
};

type CategoryMutationAction = "create" | "update" | "archive" | "delete";

type CategoryMutationResponse = {
  category?: PersistentSettingsCategory;
  error?: string;
  code?: string;
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
      className="grid grid-cols-2 rounded-[15px] border border-border bg-surface-secondary p-1"
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
            className={`finance-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] px-3 text-sm font-bold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? type === "income"
                  ? "bg-success text-[var(--status-foreground)]"
                  : "bg-danger text-[var(--status-foreground)]"
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

function createRequestKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function mutateCategory(
  action: CategoryMutationAction,
  payload: Record<string, unknown>,
) {
  const response = await fetch("/api/categories", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Category-Request-Key": createRequestKey(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = (await response.json().catch(() => ({}))) as CategoryMutationResponse;
  if (!response.ok) {
    throw new Error(result.error || "Category change could not be completed.");
  }
  return result.category ?? null;
}

export default function CategorySettingsSection({
  initialCategories,
  initialUsage,
  userId: _userId,
  available,
}: Props) {
  const router = useRouter();
  const [dialogMode, setDialogMode] = useState<CategoryDialogMode>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [usage, setUsage] = useState(initialUsage);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("az");

  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<CategoryKind>("income");
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [draftVisual, setDraftVisual] = useState<CategoryVisual>(EMPTY_VISUAL);
  const [draftVisualTouched, setDraftVisualTouched] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<PersistentSettingsCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editParentId, setEditParentId] = useState<string | null>(null);
  const [editVisual, setEditVisual] = useState<CategoryVisual>(EMPTY_VISUAL);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<PersistentSettingsCategory | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  useEffect(() => setUsage(initialUsage), [initialUsage]);

  const originalIndex = useMemo(
    () => new Map(categories.map((category, index) => [category.id, index])),
    [categories],
  );
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

  const parentOptions = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.type === "expense" &&
            !category.parent_id &&
            category.id !== selectedCategory?.id,
        )
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories, selectedCategory?.id],
  );

  const suggestedDraftVisual = useMemo(
    () => getNextCategoryVisual(categories, draftName || "Category", draftType),
    [categories, draftName, draftType],
  );
  const resolvedDraftVisual = draftVisualTouched
    ? draftVisual
    : suggestedDraftVisual;

  function resetCreate(type: CategoryKind = "income") {
    setDraftName("");
    setDraftType(type);
    setDraftParentId(null);
    setDraftVisual(getNextCategoryVisual(categories, "Category", type));
    setDraftVisualTouched(false);
  }

  function openCreateDialog(type: CategoryKind = "income") {
    resetCreate(type);
    setDialogMode("create");
  }

  function openManageDialog() {
    setSearchQuery("");
    setSelectedCategory(null);
    setDialogMode("manage");
  }

  function closeMainDialog() {
    setDialogMode(null);
    setSelectedCategory(null);
    resetCreate();
  }

  function openCategoryDetails(category: PersistentSettingsCategory) {
    setSelectedCategory(category);
    setEditName(category.name);
    setEditType(category.type);
    setEditParentId(category.parent_id);
    setEditVisual(getCategoryVisual(category));
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }

    setSavingId("new");
    try {
      const created = await mutateCategory("create", {
        name,
        type: draftType,
        color: resolvedDraftVisual.color,
        iconKey: resolvedDraftVisual.iconKey,
        parentId: draftType === "expense" ? draftParentId : null,
      });
      if (!created) throw new Error("The category was not returned.");
      setCategories((current) => [...current, created]);
      setUsage((current) => ({ ...current, [created.id]: 0 }));
      setActiveTab(created.type);
      setDialogMode("manage");
      resetCreate(created.type);
      toast.success(`${created.name} created.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setSavingId(null);
    }
  }

  async function updateCategory() {
    const category = selectedCategory;
    if (!category) return;
    const name = editName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }

    const usageCount = usage[category.id] ?? 0;
    const childCount = childCountByParent[category.id] ?? 0;
    const canChangeType = usageCount === 0 && childCount === 0;
    const nextType = canChangeType ? editType : category.type;

    setSavingId(category.id);
    try {
      const updated = await mutateCategory("update", {
        categoryId: category.id,
        name,
        type: nextType,
        color: editVisual.color,
        iconKey: editVisual.iconKey,
        parentId: nextType === "expense" ? editParentId : null,
      });
      if (!updated) throw new Error("The updated category was not returned.");
      setCategories((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setActiveTab(updated.type);
      setSelectedCategory(null);
      toast.success(`${updated.name} updated.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update category.");
    } finally {
      setSavingId(null);
    }
  }

  async function archiveCategory(category: PersistentSettingsCategory) {
    setSavingId(category.id);
    try {
      await mutateCategory("archive", { categoryId: category.id });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setSelectedCategory(null);
      toast.success(`${category.name} archived.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive category.");
    } finally {
      setSavingId(null);
    }
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
      await mutateCategory("delete", { categoryId: category.id });
      setCategories((current) => current.filter((item) => item.id !== category.id));
      setUsage((current) => {
        const next = { ...current };
        delete next[category.id];
        return next;
      });
      setSelectedCategory(null);
      setPendingDelete(null);
      toast.success(`${category.name} permanently deleted.`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : CATEGORY_DELETE_VERIFICATION_ERROR;
      setDeleteFeedback(message);
    } finally {
      setIsDeletingCategory(false);
    }
  }

  function visibleCategories(type: CategoryKind) {
    const query = searchQuery.trim().toLowerCase();
    const items = categories.filter(
      (category) =>
        category.type === type &&
        (!query || category.name.toLowerCase().includes(query)),
    );

    return [...items].sort((left, right) => {
      if (sortMode === "used") {
        const usageDifference = (usage[right.id] ?? 0) - (usage[left.id] ?? 0);
        if (usageDifference !== 0) return usageDifference;
      }
      if (sortMode === "newest") {
        return (originalIndex.get(right.id) ?? 0) - (originalIndex.get(left.id) ?? 0);
      }
      return left.name.localeCompare(right.name);
    });
  }

  function CategoryList({ type }: { type: CategoryKind }) {
    const items = visibleCategories(type);
    if (items.length === 0) {
      return (
        <div className="rounded-[18px] border border-dashed border-border px-5 py-10 text-center">
          <p className="text-sm font-bold text-text-primary">
            {searchQuery ? "No matching categories" : `No ${type} categories yet`}
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            {searchQuery
              ? "Try a different search word."
              : "Create one to organize future transactions."}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[18px] border border-border bg-card">
        {items.map((category, index) => {
          const usageCount = usage[category.id] ?? 0;
          const parent = category.parent_id
            ? categoryById.get(category.parent_id)
            : null;
          return (
            <div
              key={category.id}
              className={`flex min-w-0 items-center gap-2 px-3 py-2.5 sm:px-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => openCategoryDetails(category)}
                className="finance-focus flex min-w-0 flex-1 items-center gap-3 rounded-[13px] px-1 py-1.5 text-left hover:bg-hover"
              >
                <CategoryVisualIcon category={category} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-text-primary">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
                    {usageCount} {usageCount === 1 ? "transaction" : "transactions"}
                    {parent ? ` · Under ${parent.name}` : " · Top level"}
                  </span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions for ${category.name}`}
                  className="finance-focus grid size-10 shrink-0 place-items-center rounded-[12px] text-text-secondary hover:bg-hover hover:text-text-primary"
                >
                  <MoreHorizontal size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-[13px] border border-border bg-card p-1.5"
                >
                  <DropdownMenuItem
                    onClick={() => openCategoryDetails(category)}
                    className="min-h-9 rounded-[9px] px-2.5"
                  >
                    <Pencil size={15} /> Edit details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => void archiveCategory(category)}
                    className="min-h-9 rounded-[9px] px-2.5"
                  >
                    <Archive size={15} /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => requestCategoryDelete(category)}
                    className="min-h-9 rounded-[9px] px-2.5"
                  >
                    <Trash2 size={15} /> Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    );
  }

  const selectedUsage = selectedCategory ? usage[selectedCategory.id] ?? 0 : 0;
  const selectedChildCount = selectedCategory
    ? childCountByParent[selectedCategory.id] ?? 0
    : 0;
  const canChangeSelectedType = selectedUsage === 0 && selectedChildCount === 0;

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
                ? "Add a clean income or expense category"
                : "Category data is currently unavailable"
            }
            onClick={() => openCreateDialog()}
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
                ? "Search, edit, archive, or delete categories"
                : "Category data is currently unavailable"
            }
            onClick={openManageDialog}
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
            dialogMode === "manage"
              ? "sm:[--finance-modal-max-width:42rem]"
              : "sm:[--finance-modal-max-width:34rem]"
          }`}
        >
          <FinanceModalHeader
            title={dialogMode === "create" ? "Create category" : "Categories"}
            description={
              dialogMode === "manage"
                ? "A clean manager for income and expense categories."
                : undefined
            }
            icon={dialogMode === "manage" ? LayoutGrid : undefined}
            tone="info"
          />

          <FinanceModalBody>
            {dialogMode === "create" ? (
              <form onSubmit={addCategory} className="space-y-4">
                <FinanceFormField label="Category type">
                  <TypeSelector
                    value={draftType}
                    onChange={(type) => {
                      setDraftType(type);
                      setDraftParentId(null);
                    }}
                  />
                </FinanceFormField>

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

                {draftType === "expense" ? (
                  <FinanceFormField label="Parent category (optional)">
                    <select
                      value={draftParentId ?? ""}
                      onChange={(event) =>
                        setDraftParentId(event.target.value || null)
                      }
                      className="min-h-12 w-full rounded-[15px] border border-border bg-card px-3 text-sm font-semibold text-text-primary outline-none focus:border-active"
                    >
                      <option value="">Top level</option>
                      {parentOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>
                ) : null}

                <div className="sticky bottom-0 z-10 -mx-1 border-t border-border bg-card/95 px-1 pb-1 pt-3 backdrop-blur-sm">
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
                    {savingId === "new" ? "Creating..." : "Create category"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="min-h-0">
                <div className="sticky top-0 z-10 bg-card pb-3">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                        aria-hidden="true"
                      />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search categories"
                        aria-label="Search categories"
                        className="min-h-11 w-full rounded-[14px] border border-border bg-surface-secondary pl-10 pr-3 text-sm font-medium text-text-primary outline-none placeholder:text-text-tertiary focus:border-active"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => openCreateDialog(activeTab)}
                      className="finance-focus grid size-11 shrink-0 place-items-center rounded-[14px] bg-active text-white hover:opacity-90"
                      aria-label={`Create ${activeTab} category`}
                    >
                      <Plus size={19} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
                      <SlidersHorizontal size={13} /> Sort
                    </span>
                    <select
                      value={sortMode}
                      onChange={(event) =>
                        setSortMode(event.target.value as SortMode)
                      }
                      aria-label="Sort categories"
                      className="min-h-9 rounded-[11px] border border-border bg-surface-secondary px-2.5 text-xs font-bold text-text-primary outline-none focus:border-active"
                    >
                      <option value="az">A–Z</option>
                      <option value="used">Most used</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={(value: string) =>
                    setActiveTab(value as CategoryKind)
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="income">
                      Income ({categories.filter((item) => item.type === "income").length})
                    </TabsTrigger>
                    <TabsTrigger value="expense">
                      Expense ({categories.filter((item) => item.type === "expense").length})
                    </TabsTrigger>
                  </TabsList>
                  <div className="mt-3 max-h-[min(58dvh,35rem)] overflow-y-auto overscroll-contain pr-1">
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

      <Sheet
        open={selectedCategory !== null}
        onOpenChange={(open) => {
          if (!open && !savingId) setSelectedCategory(null);
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton
          className="max-h-[92dvh] gap-0 overflow-hidden rounded-t-[28px] border-border bg-card p-0 sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[28px] sm:border"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-5">
            <SheetTitle className="text-base font-bold text-text-primary">
              Category details
            </SheetTitle>
            <p className="text-xs leading-5 text-text-secondary">
              Edit its identity without changing linked transactions.
            </p>
          </SheetHeader>

          {selectedCategory ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-[16px] border border-border bg-surface-secondary p-3 text-center">
                <div>
                  <p className="text-lg font-bold text-text-primary">
                    {selectedUsage}
                  </p>
                  <p className="text-[11px] text-text-secondary">Transactions</p>
                </div>
                <div className="border-l border-border">
                  <p className="text-lg font-bold text-text-primary">
                    {selectedChildCount}
                  </p>
                  <p className="text-[11px] text-text-secondary">Subcategories</p>
                </div>
              </div>

              <div className="space-y-4">
                <FinanceFormField label="Category name">
                  <CategoryVisualField
                    id={`edit-category-${selectedCategory.id}`}
                    name={editName}
                    type={editType}
                    visual={editVisual}
                    onNameChange={setEditName}
                    onVisualChange={setEditVisual}
                    placeholder="Category name"
                    ariaLabel={`Edit ${selectedCategory.name} name`}
                    disabled={savingId === selectedCategory.id}
                  />
                </FinanceFormField>

                <FinanceFormField label="Category type">
                  <TypeSelector
                    value={editType}
                    onChange={(type) => {
                      setEditType(type);
                      if (type === "income") setEditParentId(null);
                    }}
                    disabled={
                      !canChangeSelectedType ||
                      savingId === selectedCategory.id
                    }
                  />
                  {!canChangeSelectedType ? (
                    <p className="mt-2 text-xs leading-5 text-text-secondary">
                      Type is locked because this category is already in use. Name,
                      icon, color, and parent can still be managed safely.
                    </p>
                  ) : null}
                </FinanceFormField>

                {editType === "expense" ? (
                  <FinanceFormField label="Parent category (optional)">
                    <select
                      value={editParentId ?? ""}
                      onChange={(event) =>
                        setEditParentId(event.target.value || null)
                      }
                      disabled={savingId === selectedCategory.id}
                      className="min-h-12 w-full rounded-[15px] border border-border bg-card px-3 text-sm font-semibold text-text-primary outline-none focus:border-active disabled:opacity-55"
                    >
                      <option value="">Top level</option>
                      {parentOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FinanceFormField>
                ) : null}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => void archiveCategory(selectedCategory)}
                  disabled={savingId === selectedCategory.id}
                  className="finance-focus flex min-h-11 w-full items-center gap-3 rounded-[13px] px-3 text-left text-sm font-bold text-text-secondary hover:bg-hover hover:text-text-primary disabled:opacity-55"
                >
                  <Archive size={17} /> Archive category
                </button>
                <button
                  type="button"
                  onClick={() => requestCategoryDelete(selectedCategory)}
                  disabled={savingId === selectedCategory.id}
                  className="finance-focus mt-1 flex min-h-11 w-full items-center gap-3 rounded-[13px] px-3 text-left text-sm font-bold text-danger hover:bg-danger/10 disabled:opacity-55"
                >
                  <Trash2 size={17} /> Delete permanently
                </button>
              </div>
            </div>
          ) : null}

          <SheetFooter className="border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
            <Button
              type="button"
              size="lg"
              onClick={() => void updateCategory()}
              disabled={
                !selectedCategory ||
                !editName.trim() ||
                savingId === selectedCategory?.id
              }
            >
              {savingId === selectedCategory?.id ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}
              {savingId === selectedCategory?.id ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
              Permanent deletion is allowed only when no transaction or
              subcategory uses it. Archiving is safer for old categories.
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
              {isDeletingCategory ? "Verifying..." : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
