"use client";

import type { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  CreditCard,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Lightbulb,
  Loader2,
  Package,
  PawPrint,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  ReceiptText,
  Repeat2,
  Save,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Tags,
  Ticket,
  TrainFront,
  Trash2,
  TrendingUp,
  Utensils,
  WalletCards,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import SettingsOneUI, {
  type AccountStats,
  type SettingsCategory,
} from "@/components/settings/SettingsOneUI";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_DELETE_VERIFICATION_ERROR,
  validateCategoryDeleteReadiness,
} from "@/lib/settings/security";

type CategoryKind = "income" | "expense";
type IconKey = keyof typeof CATEGORY_ICON_MAP | `badge:${number}`;

type CategoryVisual = {
  color: string;
  iconKey: IconKey;
};

type SettingsExperienceProps = {
  email: string;
  userId: string;
  displayName: string;
  categories: SettingsCategory[];
  categoryUsage: Record<string, number>;
  categoriesAvailable: boolean;
  stats: AccountStats;
  notificationPreferences: {
    goal_alerts_enabled: boolean;
    payable_alerts_enabled: boolean;
  };
  notificationPreferencesAvailable: boolean;
};

const ROOT_CATEGORY_VALUE = "__root__";

const AUTO_CATEGORY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4f46e5",
  "#0f766e",
  "#7c3aed",
  "#65a30d",
  "#c2410c",
  "#0284c7",
  "#be123c",
  "#475569",
  "#059669",
  "#d97706",
  "#7e22ce",
  "#0369a1",
  "#b91c1c",
  "#15803d",
  "#a21caf",
  "#0e7490",
  "#a16207",
  "#1d4ed8",
  "#be185d",
  "#047857",
  "#6d28d9",
  "#c026d3",
  "#b45309",
  "#334155",
] as const;

const CATEGORY_ICON_MAP = {
  banknote: Banknote,
  briefcase: Briefcase,
  building: Building2,
  bus: Bus,
  car: Car,
  cash: CircleDollarSign,
  coins: Coins,
  credit: CreditCard,
  fuel: Fuel,
  gift: Gift,
  education: GraduationCap,
  handCoins: HandCoins,
  health: HeartPulse,
  home: Home,
  bank: Landmark,
  laptop: Laptop,
  utilities: Lightbulb,
  package: Package,
  savings: PiggyBank,
  travel: Plane,
  receipt: ReceiptText,
  transfer: Repeat2,
  shopping: ShoppingBag,
  phone: Smartphone,
  bonus: Sparkles,
  store: Store,
  ticket: Ticket,
  train: TrainFront,
  growth: TrendingUp,
  dining: Utensils,
  wallet: WalletCards,
  repair: Wrench,
  power: Zap,
  books: BookOpen,
  pets: PawPrint,
  games: Gamepad2,
  fitness: Dumbbell,
  children: Baby,
  clothing: Shirt,
  medical: Stethoscope,
  salary: BadgeDollarSign,
  tags: Tags,
} satisfies Record<string, LucideIcon>;

const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICON_MAP) as Array<
  keyof typeof CATEGORY_ICON_MAP
>;

const CATEGORY_ICON_STORAGE_PREFIX = "jamal-category-icons";

function normalizeColor(color: string | null | undefined) {
  return color?.trim().toLowerCase() ?? "";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function semanticIconKey(name: string, type: CategoryKind) {
  const value = name.trim().toLowerCase();
  const rules: Array<[RegExp, keyof typeof CATEGORY_ICON_MAP]> = [
    [/salary|payroll|wage/, "salary"],
    [/freelance|business|work|commission/, "briefcase"],
    [/saving|deposit|reserve/, "savings"],
    [/investment|return|dividend|profit|interest/, "growth"],
    [/bonus|reward|tip/, "bonus"],
    [/rent|home|house|mortgage/, "home"],
    [/food|dining|restaurant|meal|grocery/, "dining"],
    [/fuel|petrol|gas/, "fuel"],
    [/transport|ride|taxi|car|vehicle/, "car"],
    [/bus/, "bus"],
    [/train|rail/, "train"],
    [/shopping|shop|purchase/, "shopping"],
    [/bill|utility|electric|water|internet/, "utilities"],
    [/phone|mobile/, "phone"],
    [/medical|doctor|medicine|health/, "medical"],
    [/school|education|course|tuition/, "education"],
    [/travel|flight|vacation/, "travel"],
    [/gift|donation|charity/, "gift"],
    [/repair|maintenance|service/, "repair"],
    [/pet|animal/, "pets"],
    [/game|entertainment/, "games"],
    [/gym|fitness|sport/, "fitness"],
    [/baby|child|kid/, "children"],
    [/cloth|fashion|shirt/, "clothing"],
    [/bank|account/, "bank"],
    [/transfer/, "transfer"],
    [/loan|credit|debt/, "credit"],
  ];

  const match = rules.find(([pattern]) => pattern.test(value));
  if (match) return match[1];
  return type === "income" ? "cash" : "receipt";
}

function nextGeneratedColor(index: number) {
  const hue = Math.round((index * 137.508 + 17) % 360);
  return `hsl(${hue} 68% 46%)`;
}

function buildCategoryVisuals(
  categories: SettingsCategory[],
  iconOverrides: Record<string, IconKey>,
) {
  const ordered = [...categories].sort((left, right) =>
    `${left.type}:${left.name}:${left.id}`.localeCompare(
      `${right.type}:${right.name}:${right.id}`,
    ),
  );
  const usedColors = new Set<string>();
  const usedIcons = new Set<IconKey>();
  const visuals = new Map<string, CategoryVisual>();

  ordered.forEach((category, categoryIndex) => {
    const preferredColor = normalizeColor(category.color);
    let color =
      preferredColor && !usedColors.has(preferredColor)
        ? category.color ?? preferredColor
        : AUTO_CATEGORY_COLORS.find(
            (candidate) => !usedColors.has(normalizeColor(candidate)),
          );

    if (!color) {
      let generatedIndex = categoryIndex;
      do {
        color = nextGeneratedColor(generatedIndex);
        generatedIndex += 1;
      } while (usedColors.has(normalizeColor(color)));
    }
    usedColors.add(normalizeColor(color));

    const override = iconOverrides[category.id];
    const preferredIcon = semanticIconKey(category.name, category.type);
    let iconKey: IconKey | undefined;

    if (override && !usedIcons.has(override)) iconKey = override;
    if (!iconKey && !usedIcons.has(preferredIcon)) iconKey = preferredIcon;

    if (!iconKey) {
      const start = hashString(category.id) % CATEGORY_ICON_KEYS.length;
      for (let offset = 0; offset < CATEGORY_ICON_KEYS.length; offset += 1) {
        const candidate = CATEGORY_ICON_KEYS[(start + offset) % CATEGORY_ICON_KEYS.length];
        if (!usedIcons.has(candidate)) {
          iconKey = candidate;
          break;
        }
      }
    }

    if (!iconKey) iconKey = `badge:${categoryIndex + 1}`;
    usedIcons.add(iconKey);
    visuals.set(category.id, { color, iconKey });
  });

  return visuals;
}

function getDraftVisual(
  name: string,
  type: CategoryKind,
  visuals: Map<string, CategoryVisual>,
) {
  const usedColors = new Set(
    Array.from(visuals.values(), (visual) => normalizeColor(visual.color)),
  );
  const usedIcons = new Set(
    Array.from(visuals.values(), (visual) => visual.iconKey),
  );

  let color: string | undefined = AUTO_CATEGORY_COLORS.find(
    (candidate) => !usedColors.has(normalizeColor(candidate)),
  );
  if (!color) {
    let generatedIndex = visuals.size;
    do {
      color = nextGeneratedColor(generatedIndex);
      generatedIndex += 1;
    } while (usedColors.has(normalizeColor(color)));
  }

  const semantic = semanticIconKey(name || "category", type);
  let iconKey: IconKey | undefined = !usedIcons.has(semantic)
    ? semantic
    : undefined;
  if (!iconKey) {
    iconKey = CATEGORY_ICON_KEYS.find((candidate) => !usedIcons.has(candidate));
  }
  if (!iconKey) iconKey = `badge:${visuals.size + 1}`;

  return { color, iconKey } satisfies CategoryVisual;
}

function CategoryIcon({
  visual,
  label,
  compact = false,
}: {
  visual: CategoryVisual;
  label: string;
  compact?: boolean;
}) {
  const sizeClass = compact ? "h-9 w-9 rounded-xl" : "h-11 w-11 rounded-[15px]";
  const iconSize = compact ? 16 : 19;

  if (visual.iconKey.startsWith("badge:")) {
    const number = visual.iconKey.split(":")[1];
    return (
      <span
        className={`grid shrink-0 place-items-center font-extrabold text-white shadow-sm ${sizeClass}`}
        style={{ backgroundColor: visual.color }}
        aria-label={`${label} category icon`}
      >
        {number}
      </span>
    );
  }

  const Icon =
    CATEGORY_ICON_MAP[visual.iconKey as keyof typeof CATEGORY_ICON_MAP] ?? Tags;
  return (
    <span
      className={`grid shrink-0 place-items-center text-white shadow-sm ${sizeClass}`}
      style={{ backgroundColor: visual.color }}
      aria-label={`${label} category icon`}
    >
      <Icon size={iconSize} aria-hidden="true" />
    </span>
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
      className="grid grid-cols-2 rounded-[14px] border border-border bg-surface-secondary p-1"
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
            className={`finance-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] px-3 text-sm font-bold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

function CategoriesExperience({
  open,
  onOpenChange,
  initialCategories,
  initialUsage,
  userId,
  available,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategories: SettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [categories, setCategories] = useState(initialCategories);
  const [usage, setUsage] = useState(initialUsage);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<CategoryKind>("income");
  const [draftParentId, setDraftParentId] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editParentId, setEditParentId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SettingsCategory | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [iconOverrides, setIconOverrides] = useState<Record<string, IconKey>>({});

  useEffect(() => setCategories(initialCategories), [initialCategories]);
  useEffect(() => setUsage(initialUsage), [initialUsage]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        `${CATEGORY_ICON_STORAGE_PREFIX}:${userId}`,
      );
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, IconKey>;
      setIconOverrides(parsed);
    } catch {
      setIconOverrides({});
    }
  }, [userId]);

  const visuals = useMemo(
    () => buildCategoryVisuals(categories, iconOverrides),
    [categories, iconOverrides],
  );

  useEffect(() => {
    if (!open) return;
    const next = Object.fromEntries(
      Array.from(visuals, ([id, visual]) => [id, visual.iconKey]),
    ) as Record<string, IconKey>;
    if (JSON.stringify(next) === JSON.stringify(iconOverrides)) return;
    setIconOverrides(next);
    window.localStorage.setItem(
      `${CATEGORY_ICON_STORAGE_PREFIX}:${userId}`,
      JSON.stringify(next),
    );
  }, [iconOverrides, open, userId, visuals]);

  const draftVisual = useMemo(
    () => getDraftVisual(draftName, draftType, visuals),
    [draftName, draftType, visuals],
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

  const expenseRoots = useMemo(
    () =>
      categories.filter(
        (category) => category.type === "expense" && !category.parent_id,
      ),
    [categories],
  );

  const getUsageCount = (categoryId: string) => usage[categoryId] ?? 0;
  const hasChildren = (categoryId: string) =>
    (childCountByParent[categoryId] ?? 0) > 0;

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

  function resetDraft(nextType: CategoryKind = draftType) {
    setDraftName("");
    setDraftType(nextType);
    setDraftParentId("");
    setShowMoreOptions(false);
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
        color: draftVisual.color,
        parent_id:
          draftType === "expense" && draftParentId ? draftParentId : null,
      })
      .select("id, name, type, color, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error("Could not add category. Please try again.");
      return;
    }

    const created = data as SettingsCategory;
    const nextOverrides = {
      ...iconOverrides,
      [created.id]: draftVisual.iconKey,
    };
    setIconOverrides(nextOverrides);
    window.localStorage.setItem(
      `${CATEGORY_ICON_STORAGE_PREFIX}:${userId}`,
      JSON.stringify(nextOverrides),
    );
    setCategories((current) => [...current, created]);
    setActiveTab(created.type);
    resetDraft(created.type);
    toast.success(`${name} added with a unique color and icon.`);
    router.refresh();
  }

  function startEdit(category: SettingsCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setEditParentId(category.parent_id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
  }

  async function updateCategory(category: SettingsCategory) {
    const name = editName.trim();
    const usageCount = getUsageCount(category.id);
    const categoryHasChildren = hasChildren(category.id);
    const canEditStructure = usageCount === 0 && !categoryHasChildren;
    const nextType = canEditStructure ? editType : category.type;
    const nextParentId =
      !canEditStructure
        ? category.parent_id
        : nextType === "expense" && editParentId
          ? editParentId
          : null;

    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, nextType, category.id)) {
      toast.error(`${name} already exists in ${nextType} categories.`);
      return;
    }
    if (nextParentId === category.id) {
      toast.error("A category cannot be its own parent.");
      return;
    }

    setSavingId(category.id);
    const { data, error } = await supabase
      .from("categories")
      .update({
        name,
        type: nextType,
        color: category.color ?? visuals.get(category.id)?.color,
        parent_id: nextParentId,
      })
      .eq("id", category.id)
      .eq("user_id", userId)
      .select("id, name, type, color, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error("Could not update category. Please try again.");
      return;
    }

    const updated = data as SettingsCategory;
    setCategories((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    cancelEdit();
    setActiveTab(updated.type);
    toast.success(`${name} updated.`);
    router.refresh();
  }

  function requestCategoryDelete(category: SettingsCategory) {
    const readiness = validateCategoryDeleteReadiness({
      usageCount: getUsageCount(category.id),
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
      const nextOverrides = { ...iconOverrides };
      delete nextOverrides[category.id];
      setIconOverrides(nextOverrides);
      window.localStorage.setItem(
        `${CATEGORY_ICON_STORAGE_PREFIX}:${userId}`,
        JSON.stringify(nextOverrides),
      );
      setPendingDelete(null);
      toast.success(`${category.name} removed.`);
      router.refresh();
    } catch {
      setDeleteFeedback("Could not verify or delete category. Please try again.");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  function renderParentSelect(
    id: string,
    value: string,
    onChange: (value: string) => void,
    excludeId?: string,
    disabled = false,
  ) {
    return (
      <FinanceFormField label="Parent category" htmlFor={id}>
        <Select
          value={value || ROOT_CATEGORY_VALUE}
          onValueChange={(nextValue: string) =>
            onChange(nextValue === ROOT_CATEGORY_VALUE ? "" : nextValue)
          }
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" sideOffset={8} className="z-[100] p-1.5">
            <SelectItem value={ROOT_CATEGORY_VALUE}>Top-level category</SelectItem>
            {expenseRoots
              .filter((category) => category.id !== excludeId)
              .map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FinanceFormField>
    );
  }

  function CategoryEditor({ category }: { category: SettingsCategory }) {
    const usageCount = getUsageCount(category.id);
    const categoryHasChildren = hasChildren(category.id);
    const canEditStructure = usageCount === 0 && !categoryHasChildren;
    const visual = visuals.get(category.id) ?? draftVisual;

    return (
      <div className="rounded-[20px] border border-active/30 bg-surface-secondary p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon visual={visual} label={category.name} compact />
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
            disabled={!canEditStructure}
          />
        </div>
        {editType === "expense" ? (
          <div className="mt-3">
            {renderParentSelect(
              `edit-parent-${category.id}`,
              editParentId,
              setEditParentId,
              category.id,
              !canEditStructure,
            )}
          </div>
        ) : null}
        {!canEditStructure ? (
          <p className="mt-3 text-xs leading-5 text-text-secondary">
            {usageCount > 0
              ? `Type is locked because ${usageCount} transactions use this category.`
              : "Type is locked until its subcategories are moved."}
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

  function CategoryRow({
    category,
    nested = false,
  }: {
    category: SettingsCategory;
    nested?: boolean;
  }) {
    if (editingId === category.id) {
      return (
        <div className={nested ? "ml-3 sm:ml-7" : ""}>
          <CategoryEditor category={category} />
        </div>
      );
    }

    const visual = visuals.get(category.id) ?? draftVisual;
    const usageCount = getUsageCount(category.id);
    const childCount = childCountByParent[category.id] ?? 0;
    const parent = category.parent_id
      ? categoryById.get(category.parent_id)
      : null;

    return (
      <div
        className={`group rounded-[20px] border border-border bg-card p-3 transition-colors hover:border-active/25 hover:bg-hover ${
          nested ? "ml-3 sm:ml-7" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon visual={visual} label={category.name} compact />
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
              {" · "}
              {usageCount > 0 ? `${usageCount} transactions` : "Not used yet"}
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
  }

  function CategoryList({ type }: { type: CategoryKind }) {
    const items = categories.filter((category) => category.type === type);
    const roots = items.filter((category) => {
      if (!category.parent_id) return true;
      const parent = categoryById.get(category.parent_id);
      return !parent || parent.type !== type;
    });
    const childrenByParent = items.reduce<Record<string, SettingsCategory[]>>(
      (groups, category) => {
        if (!category.parent_id) return groups;
        const parent = categoryById.get(category.parent_id);
        if (!parent || parent.type !== type) return groups;
        groups[category.parent_id] = [
          ...(groups[category.parent_id] ?? []),
          category,
        ];
        return groups;
      },
      {},
    );

    if (roots.length === 0) {
      return (
        <div className="rounded-[20px] border border-dashed border-border bg-surface-secondary px-5 py-8 text-center">
          <Tags className="mx-auto h-6 w-6 text-text-tertiary" />
          <p className="mt-3 text-sm font-bold text-text-primary">
            No {type} categories yet
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Create the first one above.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {roots.map((category) => (
          <div key={category.id} className="space-y-2">
            <CategoryRow category={category} />
            {(childrenByParent[category.id] ?? []).map((child) => (
              <CategoryRow key={child.id} category={child} nested />
            ))}
          </div>
        ))}
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
            description="Create clean income and expense labels without choosing colors or icons manually."
            icon={Tags}
            tone="info"
          />
          <FinanceModalBody>
            {!available ? (
              <div className="rounded-[20px] border border-danger/25 bg-danger/5 p-4">
                <p className="text-sm font-bold text-danger">
                  Category data is unavailable
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Nothing has been changed. Close this window and retry after refreshing.
                </p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={addCategory}
                  className="rounded-[22px] border border-active/20 bg-surface-secondary p-3 sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryIcon
                      visual={draftVisual}
                      label={draftName || `New ${draftType}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary">
                        Create a category
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        A unique color and icon are selected automatically.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
                    <FinanceFormField
                      label="Category name"
                      htmlFor="simple-category-name"
                      className="min-w-0"
                    >
                      <Input
                        id="simple-category-name"
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
                        onChange={(nextType) => {
                          setDraftType(nextType);
                          setActiveTab(nextType);
                          if (nextType === "income") {
                            setDraftParentId("");
                            setShowMoreOptions(false);
                          }
                        }}
                      />
                    </FinanceFormField>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!draftName.trim() || savingId === "new"}
                      className="w-full md:w-auto"
                    >
                      {savingId === "new" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {savingId === "new" ? "Creating..." : "Create"}
                    </Button>
                  </div>

                  {draftType === "expense" ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowMoreOptions((value) => !value)}
                        className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-text-secondary hover:bg-hover hover:text-text-primary"
                        aria-expanded={showMoreOptions}
                      >
                        <ChevronDown
                          size={15}
                          className={`transition-transform ${
                            showMoreOptions ? "rotate-180" : ""
                          }`}
                        />
                        More options
                      </button>
                      {showMoreOptions ? (
                        <div className="mt-2 max-w-md">
                          {renderParentSelect(
                            "simple-category-parent",
                            draftParentId,
                            setDraftParentId,
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </form>

                <div className="mt-4 min-h-0">
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
                    <div className="mt-3 max-h-[min(48dvh,28rem)] overflow-y-auto overscroll-contain pr-1">
                      <TabsContent value="income" className="mt-0">
                        <CategoryList type="income" />
                      </TabsContent>
                      <TabsContent value="expense" className="mt-0">
                        <CategoryList type="expense" />
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </>
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
              Deletion is allowed only when no transactions or subcategories use it.
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

export default function SettingsExperience(props: SettingsExperienceProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);

  function captureCategoriesClick(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest("button");
    if (!button) return;
    const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const isCategoriesLauncher =
      text.startsWith("Categories") &&
      text.includes("Manage income and expense categories");
    if (!isCategoriesLauncher) return;

    event.preventDefault();
    event.stopPropagation();
    setCategoryOpen(true);
  }

  return (
    <>
      <div onClickCapture={captureCategoriesClick}>
        <SettingsOneUI {...props} />
      </div>
      <CategoriesExperience
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        initialCategories={props.categories}
        initialUsage={props.categoryUsage}
        userId={props.userId}
        available={props.categoriesAvailable}
      />
    </>
  );
}
