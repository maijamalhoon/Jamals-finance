"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Lightbulb,
  Loader2,
  Palette,
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
  CATEGORY_ICON_KEYS,
  CATEGORY_VISUAL_COLORS,
  CategoryVisualIcon,
  getCategoryIconComponent,
  getCategoryVisual,
  getNextCategoryVisual,
  type CategoryIconKey,
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
  created_at?: string | null;
  archived_at?: string | null;
  sort_order?: number;
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

type CategoryVisualValue = {
  color: string;
  iconKey: CategoryIconKey;
};

const QUICK_COLORS = [
  "#475569",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#334155",
] as const;

const INCOME_ICON_ORDER = [
  "salary",
  "banknote",
  "briefcase",
  "store",
  "handCoins",
  "bonus",
  "growth",
  "coins",
  "building",
  "receipt",
  "education",
  "gift",
  "bank",
  "cash",
  "wallet",
  "transfer",
  "credit",
  "tags",
] as const;

const EXPENSE_ICON_ORDER = [
  "home",
  "groceries",
  "dining",
  "drink",
  "utilities",
  "power",
  "water",
  "internet",
  "phone",
  "fuel",
  "car",
  "bike",
  "bus",
  "train",
  "travel",
  "ticket",
  "medical",
  "health",
  "education",
  "books",
  "children",
  "pets",
  "personal",
  "clothing",
  "fitness",
  "games",
  "laptop",
  "painting",
  "repair",
  "package",
  "shopping",
  "gift",
  "tax",
  "credit",
  "savings",
  "transfer",
  "wallet",
  "bank",
  "receipt",
  "tags",
] as const;

function formatIconLabel(iconKey: string) {
  return iconKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function orderedIconKeys(type: CategoryKind) {
  const preferred = type === "income" ? INCOME_ICON_ORDER : EXPENSE_ICON_ORDER;
  const preferredSet = new Set<string>(preferred);
  return [
    ...preferred,
    ...CATEGORY_ICON_KEYS.filter((iconKey) => !preferredSet.has(iconKey)),
  ] as CategoryIconKey[];
}

function normalizeHex(value: string) {
  const candidate = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : null;
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

function ModeBackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="mb-3">
      <ArrowLeft size={15} /> Back
    </Button>
  );
}

function ParentCategoryPicker({
  categories,
  value,
  onChange,
  excludeId,
}: {
  categories: PersistentSettingsCategory[];
  value: string;
  onChange: (value: string) => void;
  excludeId?: string;
}) {
  const choices = categories
    .filter(
      (category) =>
        category.type === "expense" &&
        !category.parent_id &&
        category.id !== excludeId,
    )
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="finance-focus min-h-11 w-full rounded-[14px] border border-border bg-card px-3 text-sm font-semibold text-text-primary outline-none"
    >
      <option value="">Top level category</option>
      {choices.map((category) => (
        <option key={category.id} value={category.id}>
          Under {category.name}
        </option>
      ))}
    </select>
  );
}

function CategoryVisualPicker({
  type,
  value,
  onChange,
  disabled = false,
}: {
  type: CategoryKind;
  value: CategoryVisualValue;
  onChange: (value: CategoryVisualValue) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value.color);
  const iconKeys = useMemo(() => orderedIconKeys(type), [type]);
  const SelectedIcon = getCategoryIconComponent(value.iconKey);

  useEffect(() => setHexDraft(value.color), [value.color]);

  function commitHex() {
    const normalized = normalizeHex(hexDraft);
    if (!normalized) {
      setHexDraft(value.color);
      toast.error("Enter a valid six-digit hex color, for example #2563EB.");
      return;
    }
    onChange({ ...value, color: normalized });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        className="finance-focus group flex h-12 w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded-[14px] border border-border bg-card transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Choose category color and icon"
      >
        <SelectedIcon
          size={24}
          strokeWidth={2.1}
          absoluteStrokeWidth
          style={{ color: value.color }}
          aria-hidden="true"
        />
        <ChevronDown
          size={13}
          className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          sideOffset={8}
          align="start"
          className="z-[200] outline-none"
        >
          <Popover.Popup className="max-h-[min(31rem,calc(100dvh-1rem))] w-[19.5rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-[16px] border border-border bg-card p-3 text-text-primary shadow-[var(--shadow-premium)] outline-none">
            <div
              className="flex flex-wrap gap-2"
              aria-label="Quick category colors"
            >
              {QUICK_COLORS.map((color) => {
                const selected = value.color.toUpperCase() === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange({ ...value, color })}
                    className="finance-focus grid size-7 place-items-center rounded-full border border-white/15 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                  >
                    {selected ? (
                      <Check
                        size={14}
                        className="text-white drop-shadow"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="my-3 h-px bg-border" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-text-primary">Custom color</p>
                <p className="mt-0.5 text-[10px] text-text-tertiary">
                  Pick any color or enter a hex value.
                </p>
              </div>
              <label
                className="finance-focus relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-card shadow-[0_0_0_1px_var(--border)]"
                style={{ backgroundColor: value.color }}
                aria-label="Open custom color picker"
              >
                <Palette
                  size={16}
                  className="text-white drop-shadow"
                  aria-hidden="true"
                />
                <input
                  type="color"
                  value={value.color}
                  onChange={(event) =>
                    onChange({ ...value, color: event.target.value.toUpperCase() })
                  }
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
                Hex
              </span>
              <input
                value={hexDraft}
                onChange={(event) => setHexDraft(event.target.value)}
                onBlur={commitHex}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitHex();
                  }
                }}
                maxLength={7}
                className="finance-focus h-9 min-w-0 flex-1 rounded-[10px] border border-border bg-surface-secondary px-3 font-mono text-xs font-semibold uppercase text-text-primary outline-none"
                aria-label="Category color hex value"
              />
              <span
                className="size-7 shrink-0 rounded-[8px] border border-border"
                style={{ backgroundColor: value.color }}
                aria-hidden="true"
              />
            </div>

            <div className="my-3 h-px bg-border" />

            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
              {type === "income" ? "Income" : "Expense"} icons
            </p>
            <div className="grid max-h-52 grid-cols-7 gap-1 overflow-y-auto overscroll-contain pr-1">
              {iconKeys.map((iconKey) => {
                const Icon = getCategoryIconComponent(iconKey);
                const selected = value.iconKey === iconKey;
                const label = formatIconLabel(iconKey);
                return (
                  <button
                    key={iconKey}
                    type="button"
                    title={label}
                    onClick={() => onChange({ ...value, iconKey })}
                    className={`finance-focus grid size-9 place-items-center rounded-[10px] border transition-colors ${
                      selected
                        ? "border-active bg-active/10"
                        : "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary"
                    }`}
                    style={selected ? { color: value.color } : undefined}
                    aria-label={`Use ${label} icon`}
                    aria-pressed={selected}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      absoluteStrokeWidth
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>

            <Popover.Close type="button" className="finance-focus mt-3 w-full rounded-[10px] border border-border bg-surface-secondary px-3 py-2 text-xs font-bold text-text-primary hover:bg-hover">
              Done
            </Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
  const [draftColor, setDraftColor] = useState<string>(CATEGORY_VISUAL_COLORS[0]);
  const [draftIconKey, setDraftIconKey] = useState<CategoryIconKey>("tags");
  const [draftParentId, setDraftParentId] = useState("");
  const [draftVisualTouched, setDraftVisualTouched] = useState(false);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editColor, setEditColor] = useState<string>(CATEGORY_VISUAL_COLORS[0]);
  const [editIconKey, setEditIconKey] = useState<CategoryIconKey>("tags");
  const [editParentId, setEditParentId] = useState("");

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
    setDraftParentId("");
    setDraftVisualTouched(false);
    setEditingId(null);
    setPendingDelete(null);
    setDeleteFeedback(null);
  }, [open]);

  const draftSuggestion = useMemo(
    () => getNextCategoryVisual(categories, draftName || `New ${draftType}`, draftType),
    [categories, draftName, draftType],
  );

  useEffect(() => {
    if (draftVisualTouched) return;
    setDraftColor(draftSuggestion.color);
    setDraftIconKey(draftSuggestion.iconKey);
  }, [draftSuggestion, draftVisualTouched]);

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

  function openCreate(type: CategoryKind) {
    const visual = getNextCategoryVisual(categories, `New ${type}`, type);
    setDraftName("");
    setDraftType(type);
    setDraftColor(visual.color);
    setDraftIconKey(visual.iconKey);
    setDraftParentId("");
    setDraftVisualTouched(false);
    setEditingId(null);
    setMode("create");
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

    const validParent =
      draftType === "expense" &&
      draftParentId &&
      categories.some(
        (category) =>
          category.id === draftParentId && category.type === "expense",
      )
        ? draftParentId
        : null;

    setSavingId("new");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        type: draftType,
        color: draftColor,
        icon_key: draftIconKey,
        parent_id: validParent,
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
    toast.success(`${name} created. Its icon and color are saved permanently.`);
    router.refresh();
  }

  function startEdit(category: PersistentSettingsCategory) {
    const visual = getCategoryVisual(category);
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setEditColor(visual.color);
    setEditIconKey(visual.iconKey);
    setEditParentId(category.parent_id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
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

    const validParent =
      nextType === "expense" &&
      editParentId &&
      editParentId !== category.id &&
      categories.some(
        (item) => item.id === editParentId && item.type === "expense",
      )
        ? editParentId
        : null;

    setSavingId(category.id);
    const { data, error } = await supabase
      .from("categories")
      .update({
        name,
        type: nextType,
        color: editColor,
        icon_key: editIconKey,
        parent_id: validParent,
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
    toast.success(`${name} updated with its saved icon and color.`);
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
            onClick={() => openCreate(type)}
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
                  <CategoryVisualPicker
                    type={editType}
                    value={{ color: editColor, iconKey: editIconKey }}
                    onChange={(visual) => {
                      setEditColor(visual.color);
                      setEditIconKey(visual.iconKey);
                    }}
                    disabled={savingId === category.id}
                  />
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
                    onChange={(nextType) => {
                      setEditType(nextType);
                      if (nextType === "income") setEditParentId("");
                    }}
                    disabled={!canChangeType || savingId === category.id}
                  />
                </div>
                {!canChangeType ? (
                  <p className="mt-2 text-xs leading-5 text-text-secondary">
                    Type remains locked while transactions or subcategories use this category.
                  </p>
                ) : null}
                {editType === "expense" ? (
                  <div className="mt-3">
                    <ParentCategoryPicker
                      categories={categories}
                      value={editParentId}
                      onChange={setEditParentId}
                      excludeId={category.id}
                    />
                  </div>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-text-secondary">
                  The selected icon and color are remembered everywhere this category appears.
                </p>
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
                    Saved identity · {formatIconLabel(visual.iconKey)} · {visual.color}
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
            description="Create, organize, and permanently remember every income and expense category visual."
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
                    See current income and expense categories with their saved icon, color, hierarchy, and usage.
                  </span>
                  <span className="mt-4 block text-xs font-bold text-active">
                    {categories.length} saved categories
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreate(activeTab)}
                  className="finance-focus group rounded-[24px] border border-active/25 bg-active/5 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-active/40 hover:bg-active/10 hover:shadow-[var(--shadow-soft)]"
                >
                  <span className="finance-icon-bubble h-12 w-12 text-active">
                    <Plus size={22} />
                  </span>
                  <span className="mt-4 block text-base font-extrabold text-text-primary">
                    Create Category
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-text-secondary">
                    Use the project-style visual picker to choose a permanent color and finance icon.
                  </span>
                  <span className="mt-4 block text-xs font-bold text-active">
                    Income and expense icon library
                  </span>
                </button>
              </div>
            ) : mode === "create" ? (
              <div>
                <ModeBackButton onClick={() => setMode("home")} />
                <form
                  onSubmit={addCategory}
                  className="rounded-[24px] border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-extrabold text-text-primary">
                        Create category
                      </p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">
                        Give it a name, type, icon, color, and optional parent.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-surface-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                      Saved memory
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <FinanceFormField
                      label="Category name"
                      htmlFor="persistent-category-name"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryVisualPicker
                          type={draftType}
                          value={{ color: draftColor, iconKey: draftIconKey }}
                          onChange={(visual) => {
                            setDraftColor(visual.color);
                            setDraftIconKey(visual.iconKey);
                            setDraftVisualTouched(true);
                          }}
                          disabled={savingId === "new"}
                        />
                        <Input
                          id="persistent-category-name"
                          value={draftName}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setDraftName(event.target.value)
                          }
                          placeholder="e.g. Salary, Rent, Fuel"
                          autoComplete="off"
                          className="min-w-0 flex-1"
                          autoFocus
                        />
                      </div>
                    </FinanceFormField>

                    <div className="flex items-start gap-3 rounded-[16px] border border-border bg-surface-secondary p-3">
                      <Lightbulb
                        size={18}
                        className="mt-0.5 shrink-0 text-text-tertiary"
                        aria-hidden="true"
                      />
                      <p className="text-xs leading-5 text-text-secondary">
                        This icon and color stay attached to the category in transactions, reports, budgets, and settings. You can change them later without losing category history.
                      </p>
                    </div>

                    <FinanceFormField label="Type">
                      <TypeSelector
                        value={draftType}
                        onChange={(nextType) => {
                          setDraftType(nextType);
                          setDraftParentId("");
                          setDraftVisualTouched(false);
                        }}
                        disabled={savingId === "new"}
                      />
                    </FinanceFormField>

                    {draftType === "expense" ? (
                      <FinanceFormField label="Parent category (optional)">
                        <ParentCategoryPicker
                          categories={categories}
                          value={draftParentId}
                          onChange={setDraftParentId}
                        />
                      </FinanceFormField>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row min-[420px]:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMode("home")}
                        disabled={savingId === "new"}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={!draftName.trim() || savingId === "new"}
                      >
                        {savingId === "new" ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : (
                          <Plus size={17} />
                        )}
                        {savingId === "new" ? "Creating..." : "Create category"}
                      </Button>
                    </div>
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
                    onClick={() => openCreate(activeTab)}
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
