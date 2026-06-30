"use client";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Fingerprint,
  HandCoins,
  Loader2,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dispatchCurrencyChange,
  useCurrency,
} from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase/client";
import {
  applyThemePreference,
  getStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type CategoryKind = "income" | "expense";
type ThemeMode = ThemePreference;
type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";
type CurrencyCode = "PKR" | "USD";

export interface SettingsCategory {
  id: string;
  name: string;
  type: CategoryKind;
  color: string | null;
  parent_id: string | null;
}

export interface AccountStats {
  accounts: number;
  transactions: number;
  goals: number;
  investments: number;
}

interface SettingsOneUIProps {
  email: string;
  userId: string;
  displayName: string;
  categories: SettingsCategory[];
  categoryUsage: Record<string, number>;
  stats: AccountStats;
}

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  right?: ReactNode;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<CategoryKind, string> = {
  income: "#22c55e",
  expense: "#f59e0b",
};

const CATEGORY_PALETTE = [
  "#22c55e",
  "#ef4444",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#6b7280",
];

const THEME_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "system",
    label: "System",
    description: "Follow browser and OS",
    icon: <Monitor size={16} />,
  },
  {
    value: "light",
    label: "Light",
    description: "Bright finance workspace",
    icon: <Sun size={16} />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dim finance workspace",
    icon: <Moon size={16} />,
  },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
      {children}
    </p>
  );
}

function IconBubble({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "red" | "gray" | "violet";
}) {
  const tones: Record<string, string> = {
    blue: "text-active",
    green: "text-success",
    red: "text-danger",
    gray: "text-text-secondary",
    violet: "text-active",
  };

  return (
    <span
      className={`finance-icon-bubble h-11 w-11 rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return <div className="finance-panel min-w-0 overflow-hidden">{children}</div>;
}

function SettingsRow({
  icon,
  title,
  description,
  right = <ChevronRight size={18} className="text-text-secondary" />,
  onClick,
}: SettingsRowProps) {
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-text-primary">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
          {description}
        </span>
      </span>
      {right}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="finance-focus flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover sm:px-5"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover sm:px-5">
      {content}
    </div>
  );
}

function Divider() {
  return <div className="ml-[76px] h-px bg-border" />;
}

function SoftSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={`finance-focus relative h-8 w-14 shrink-0 rounded-full border transition-colors ${
        checked ?
          "border-active bg-active"
        : "border-border bg-surface-secondary"
      }`}
    >
      <span
        className={`absolute top-0.5 grid h-7 w-7 place-items-center rounded-full bg-card shadow-theme transition-transform ${
          checked ? "translate-x-6" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ThemeSelector({
  value,
  resolvedTheme,
  onChange,
}: {
  value: ThemeMode;
  resolvedTheme: ResolvedTheme;
  onChange: (value: ThemeMode) => void;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <IconBubble tone="blue">
          <Palette size={21} />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-5 text-text-primary">
            Theme
          </p>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">
            {value === "system" ?
              `Following system: ${resolvedTheme}`
            : `${value === "dark" ? "Dark" : "Light"} mode is active`}
          </p>
        </div>
        <span className="finance-state-pill hidden sm:inline-flex">
          {resolvedTheme}
        </span>
      </div>

      <div
        className="mt-4 grid gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Theme preference"
      >
        {THEME_OPTIONS.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`finance-focus flex min-w-0 items-center gap-3 rounded-[var(--oneui-control-radius)] border px-3 py-3 text-left transition-colors ${
                active ?
                  "border-active bg-active/10 text-active"
                : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] border border-current/20 bg-card">
                {option.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block truncate text-[11px] font-semibold opacity-75">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileDialog({
  email,
  profileName,
  onProfileNameChange,
}: {
  email: string;
  profileName: string;
  onProfileNameChange: (name: string) => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(profileName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraftName(profileName);
  }, [open, profileName]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      toast.error("Enter a display name.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, name },
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    onProfileNameChange(name);
    toast.success("Profile updated.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Profile Settings
          </DialogTitle>
          <DialogDescription>
            Update the name shown across the app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="display-name">
              Display name
            </label>
            <Input
              id="display-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="profile-email">
              Email
            </label>
            <Input id="profile-email" value={email} disabled />
          </div>
          <Button type="submit" disabled={saving} className="w-full" size="lg">
            {saving ?
              <Loader2 className="animate-spin" size={16} />
            : <Save size={16} />}
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SecurityDialog({ email }: { email: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("jamal-2fa-enabled");
    setTwoFactorEnabled(saved === "true");
  }, []);

  function toggleTwoFactor(next: boolean) {
    setTwoFactorEnabled(next);
    window.localStorage.setItem("jamal-2fa-enabled", String(next));
    toast.success(
      next ? "2FA preference enabled." : "2FA preference disabled.",
    );
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error("Enter your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password updated successfully.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SettingsRow
        icon={
          <IconBubble tone="gray">
            <LockKeyhole size={21} />
          </IconBubble>
        }
        title="Security"
        description="Password and local 2FA preference"
        onClick={() => setOpen(true)}
      />
      <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Security</DialogTitle>
          <DialogDescription>
            Update account protection for {email || "this profile"}.
          </DialogDescription>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-border bg-surface-secondary p-4">
            <div className="mb-4 flex items-center gap-3">
              <IconBubble tone="blue">
                <ShieldCheck size={20} />
              </IconBubble>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  Update Password
                </p>
                <p className="text-xs text-text-secondary">
                  Your active Supabase session authorizes this change.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="field-label" htmlFor="current-password">
                  Current Password
                </label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="new-password">
                  New Password
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full"
              size="lg"
            >
              {isSubmitting ?
                <Loader2 className="animate-spin" size={16} />
              : <Save size={16} />}
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </motion.form>

        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-4 py-4">
          <IconBubble tone="green">
            <CheckCircle2 size={20} />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-text-secondary">
              Preference saved locally until backend enrollment is added.
            </p>
          </div>
          <SoftSwitch
            checked={twoFactorEnabled}
            onCheckedChange={toggleTwoFactor}
            label="Toggle two-factor authentication"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesDialog({
  initialCategories,
  initialUsage,
  userId,
}: {
  initialCategories: SettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [categories, setCategories] =
    useState<SettingsCategory[]>(initialCategories);
  const [usage, setUsage] = useState<Record<string, number>>(initialUsage);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(CATEGORY_COLORS.income);
  const [draftParentId, setDraftParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<CategoryKind>("income");
  const [editColor, setEditColor] = useState(CATEGORY_COLORS.income);
  const [editParentId, setEditParentId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setUsage(initialUsage);
  }, [initialUsage]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const childCountByParent = useMemo(
    () =>
      categories.reduce<Record<string, number>>((counts, category) => {
        if (!category.parent_id) return counts;
        counts[category.parent_id] = (counts[category.parent_id] ?? 0) + 1;
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

  function getUsageCount(categoryId: string) {
    return usage[categoryId] ?? 0;
  }

  function hasChildren(categoryId: string) {
    return (childCountByParent[categoryId] ?? 0) > 0;
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

  function resetDraft(nextType = activeTab) {
    setDraftName("");
    setDraftColor(CATEGORY_COLORS[nextType]);
    setDraftParentId("");
  }

  function startEdit(category: SettingsCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditType(category.type);
    setEditColor(category.color ?? CATEGORY_COLORS[category.type]);
    setEditParentId(category.parent_id ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) {
      toast.error("Enter a category name.");
      return;
    }
    if (hasDuplicateName(name, activeTab)) {
      toast.error(`${name} already exists in ${activeTab} categories.`);
      return;
    }

    setSavingId("new");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        type: activeTab,
        color: draftColor,
        parent_id:
          activeTab === "expense" && draftParentId ? draftParentId : null,
      })
      .select("id, name, type, color, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error(error?.message || "Could not add category.");
      return;
    }

    setCategories((current) => [...current, data as SettingsCategory]);
    resetDraft(activeTab);
    toast.success(`${name} added.`);
    router.refresh();
  }

  async function updateCategory(category: SettingsCategory) {
    const name = editName.trim();
    const usageCount = getUsageCount(category.id);
    const categoryHasChildren = hasChildren(category.id);
    const canEditStructure = usageCount === 0 && !categoryHasChildren;
    const nextType = canEditStructure ? editType : category.type;
    const nextParentId =
      !canEditStructure ? category.parent_id
      : nextType === "expense" && editParentId ? editParentId
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
        color: editColor,
        parent_id: nextParentId,
      })
      .eq("id", category.id)
      .select("id, name, type, color, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error(error?.message || "Could not update category.");
      return;
    }

    setCategories((current) =>
      current.map((item) =>
        item.id === category.id ? (data as SettingsCategory) : item,
      ),
    );
    cancelEdit();
    setActiveTab((data as SettingsCategory).type);
    toast.success(`${name} updated.`);
    router.refresh();
  }

  async function removeCategory(category: SettingsCategory) {
    const usageCount = getUsageCount(category.id);
    const childCount = childCountByParent[category.id] ?? 0;

    if (usageCount > 0) {
      toast.error(`Used by ${usageCount} transactions.`);
      return;
    }

    if (childCount > 0) {
      toast.error(`Move ${childCount} subcategories before deleting.`);
      return;
    }

    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) {
      return;
    }

    setSavingId(category.id);
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);
    setSavingId(null);

    if (error) {
      toast.error(error.message);
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
    toast.success(`${category.name} removed.`);
    router.refresh();
  }

  function ColorPicker({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (color: string) => void;
    label: string;
  }) {
    return (
      <div>
        <p className="field-label">{label}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`Pick ${color}`}
              aria-pressed={value === color}
              className="finance-focus grid h-8 w-8 place-items-center rounded-full border border-border transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                boxShadow:
                  value === color ?
                    "0 0 0 3px var(--card), 0 0 0 5px var(--active)"
                  : "0 0 0 3px color-mix(in srgb, var(--card), transparent 18%)",
              }}
            >
              {value === color && (
                <Check
                  size={14}
                  className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function ParentSelect({
    id,
    type,
    value,
    onChange,
    excludeId,
    disabled,
  }: {
    id: string;
    type: CategoryKind;
    value: string;
    onChange: (value: string) => void;
    excludeId?: string;
    disabled?: boolean;
  }) {
    if (type === "income") {
      return (
        <div>
          <label className="field-label" htmlFor={id}>
            Parent/root
          </label>
          <select id={id} defaultValue="" disabled className="field-input">
            <option value="">Root category</option>
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="field-label" htmlFor={id}>
          Parent/root
        </label>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="field-input"
        >
          <option value="">Root category</option>
          {expenseRoots
            .filter((root) => root.id !== excludeId)
            .map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
        </select>
      </div>
    );
  }

  function CategoryEditor({ category }: { category: SettingsCategory }) {
    const usageCount = getUsageCount(category.id);
    const categoryHasChildren = hasChildren(category.id);
    const canEditStructure = usageCount === 0 && !categoryHasChildren;

    return (
      <div className="rounded-[24px] border border-active/25 bg-card p-3 shadow-theme">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <div>
            <label className="field-label" htmlFor={`edit-name-${category.id}`}>
              Name
            </label>
            <Input
              id={`edit-name-${category.id}`}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="field-label" htmlFor={`edit-type-${category.id}`}>
              Type
            </label>
            <select
              id={`edit-type-${category.id}`}
              value={editType}
              disabled={!canEditStructure}
              onChange={(event) => {
                const nextType = event.target.value as CategoryKind;
                setEditType(nextType);
                if (nextType === "income") setEditParentId("");
              }}
              className="field-input"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <ParentSelect
            id={`edit-parent-${category.id}`}
            type={editType}
            value={editParentId}
            onChange={setEditParentId}
            excludeId={category.id}
            disabled={!canEditStructure}
          />
        </div>

        <div className="mt-3">
          <ColorPicker
            value={editColor}
            onChange={setEditColor}
            label="Color"
          />
        </div>

        {!canEditStructure && (
          <p className="mt-3 rounded-[16px] border border-border bg-surface-secondary px-3 py-2 text-xs leading-5 text-text-secondary">
            {usageCount > 0 ?
              `Type and parent are locked because this category is used by ${usageCount} transactions.`
            : "Type and parent are locked until subcategories are moved."}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            onClick={() => updateCategory(category)}
            disabled={savingId === category.id || !editName.trim()}
            size="sm"
            className="sm:w-auto"
          >
            {savingId === category.id ?
              <Loader2 className="animate-spin" size={14} />
            : <Save size={14} />}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={cancelEdit}
            disabled={savingId === category.id}
            size="sm"
            className="sm:w-auto"
          >
            <X size={14} />
            Cancel
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
    const usageCount = getUsageCount(category.id);
    const childCount = childCountByParent[category.id] ?? 0;
    const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
    const deleteDisabled = savingId === category.id;

    if (editingId === category.id) {
      return (
        <div className={nested ? "ml-3 sm:ml-6" : ""}>
          <CategoryEditor category={category} />
        </div>
      );
    }

    return (
      <div
        className={`rounded-[22px] border border-border bg-card p-3 transition-colors hover:bg-hover ${
          nested ? "ml-3 sm:ml-6" : ""
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{
              backgroundColor: category.color ?? CATEGORY_COLORS[category.type],
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-sm font-bold text-text-primary">
                {category.name}
              </p>
              <span
                className={`finance-state-pill ${
                  category.type === "income" ?
                    "finance-status-success"
                  : "finance-status-warning"
                }`}
              >
                {category.type}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-text-secondary">
              {parent ? `${parent.name} / ${category.name}` : "Root category"}
              {" - "}
              {usageCount > 0 ?
                `Used by ${usageCount} transactions`
              : "No transactions"}
              {childCount > 0 ? ` - ${childCount} subcategories` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => startEdit(category)}
              disabled={savingId === category.id}
              aria-label={`Edit ${category.name}`}
            >
              <Pencil size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeCategory(category)}
              disabled={deleteDisabled}
              title={
                usageCount > 0 ?
                  `Used by ${usageCount} transactions`
                : childCount > 0 ?
                  `Move ${childCount} subcategories first`
                : `Delete ${category.name}`
              }
              aria-label={`Delete ${category.name}`}
              className="text-danger hover:text-danger"
            >
              {savingId === category.id ?
                <Loader2 className="animate-spin" size={14} />
              : <Trash2 size={14} />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function CategorySection({
    title,
    type,
  }: {
    title: string;
    type: CategoryKind;
  }) {
    const items = categories.filter((category) => category.type === type);
    const roots = items.filter((category) => {
      if (!category.parent_id) return true;
      const parent = categoryById.get(category.parent_id);
      return !parent || parent.type !== type;
    });
    const childrenByParent = items.reduce<Record<string, SettingsCategory[]>>(
      (grouped, category) => {
        if (!category.parent_id) return grouped;
        const parent = categoryById.get(category.parent_id);
        if (!parent || parent.type !== type) return grouped;
        grouped[category.parent_id] = [
          ...(grouped[category.parent_id] ?? []),
          category,
        ];
        return grouped;
      },
      {},
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
              {title}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              {items.length} total,{" "}
              {items.reduce((sum, category) => sum + getUsageCount(category.id), 0)}{" "}
              linked transactions
            </p>
          </div>
          <span className="finance-state-pill">{items.length}</span>
        </div>

        {roots.length === 0 ?
          <div className="rounded-[22px] border border-dashed border-border bg-card p-5 text-center">
            <p className="text-sm font-semibold text-text-primary">
              No {type} categories yet
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Add one below and it will appear in transaction forms.
            </p>
          </div>
        : roots.map((category) => (
            <div key={category.id} className="space-y-2">
              <CategoryRow category={category} />
              {(childrenByParent[category.id] ?? []).map((child) => (
                <CategoryRow key={child.id} category={child} nested />
              ))}
            </div>
          ))
        }
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SettingsRow
        icon={
          <IconBubble tone="violet">
            <Tags size={21} />
          </IconBubble>
        }
        title="Categories"
        description="Manage income and expense categories"
        onClick={() => setOpen(true)}
      />
      <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Categories</DialogTitle>
          <DialogDescription>
            Add, edit, recolor, organize, and safely delete categories.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const nextType = value as CategoryKind;
            setActiveTab(nextType);
            resetDraft(nextType);
            cancelEdit();
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-3xl border border-border bg-surface-secondary p-4"
            >
              <CategorySection
                title={
                  activeTab === "income" ?
                    "Income Categories"
                  : "Expense Categories"
                }
                type={activeTab}
              />
            </motion.div>
          </TabsContent>
        </Tabs>

        <form
          onSubmit={addCategory}
          className="space-y-3 rounded-3xl border border-border bg-card p-3"
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="min-w-0">
              <label className="field-label" htmlFor="category-name">
                Add custom category
              </label>
              <Input
                id="category-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={`New ${activeTab} category`}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="category-type">
                Type
              </label>
              <select
                id="category-type"
                value={activeTab}
                onChange={(event) => {
                  const nextType = event.target.value as CategoryKind;
                  setActiveTab(nextType);
                  resetDraft(nextType);
                }}
                className="field-input"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>
          <ParentSelect
            id="category-parent"
            type={activeTab}
            value={draftParentId}
            onChange={setDraftParentId}
          />
          <ColorPicker
            value={draftColor}
            onChange={setDraftColor}
            label="Color"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={!draftName.trim() || savingId === "new"}
              size="lg"
            >
              {savingId === "new" ?
                <Loader2 className="animate-spin" size={16} />
              : <Plus size={16} />}
              {savingId === "new" ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreferencesDialog({
  currency,
  dateFormat,
  compactMode,
  onSave,
}: {
  currency: CurrencyCode;
  dateFormat: DateFormat;
  compactMode: boolean;
  onSave: (next: {
    currency: CurrencyCode;
    dateFormat: DateFormat;
    compactMode: boolean;
  }) => void;
}) {
  const { live, rate } = useCurrency();
  const [open, setOpen] = useState(false);
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>(currency);
  const [draftDateFormat, setDraftDateFormat] =
    useState<DateFormat>(dateFormat);
  const [draftCompact, setDraftCompact] = useState(compactMode);

  useEffect(() => {
    if (!open) return;
    setDraftCurrency(currency);
    setDraftDateFormat(dateFormat);
    setDraftCompact(compactMode);
  }, [compactMode, currency, dateFormat, open]);

  function handleSave() {
    onSave({
      currency: draftCurrency,
      dateFormat: draftDateFormat,
      compactMode: draftCompact,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SettingsRow
        icon={
          <IconBubble tone="green">
            <SlidersHorizontal size={21} />
          </IconBubble>
        }
        title="Preferences"
        description={`${currency} currency, ${compactMode ? "compact" : "comfortable"} density`}
        onClick={() => setOpen(true)}
      />
      <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Preferences</DialogTitle>
          <DialogDescription>
            Control display defaults for this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              value={draftCurrency}
              onChange={(event) =>
                setDraftCurrency(event.target.value as CurrencyCode)
              }
              className="field-input"
            >
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
            <p className="mt-2 text-xs text-text-secondary">
              {live ?
                `Live rate: 1 USD = ${rate.toFixed(2)} PKR`
              : `Fallback rate: 1 USD = ${rate.toFixed(2)} PKR`}
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="date-format">
              Date format
            </label>
            <select
              id="date-format"
              value={draftDateFormat}
              onChange={(event) =>
                setDraftDateFormat(event.target.value as DateFormat)
              }
              className="field-input"
            >
              <option value="MMM d, yyyy">Jun 22, 2026</option>
              <option value="dd MMM yyyy">22 Jun 2026</option>
              <option value="yyyy-MM-dd">2026-06-22</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface-secondary px-4 py-4">
            <div>
              <p className="text-sm font-bold text-text-primary">
                Compact dashboard
              </p>
              <p className="text-xs text-text-secondary">
                Save a denser reading preference for this device.
              </p>
            </div>
            <SoftSwitch
              checked={draftCompact}
              onCheckedChange={setDraftCompact}
              label="Toggle compact dashboard preference"
            />
          </div>
          <Button onClick={handleSave} className="w-full" size="lg">
            <Save size={16} />
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsOneUI({
  email,
  userId,
  displayName,
  categories,
  categoryUsage,
  stats,
}: SettingsOneUIProps) {
  const router = useRouter();
  const supabase = createClient();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [themeReady, setThemeReady] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("PKR");
  const [dateFormat, setDateFormat] = useState<DateFormat>("MMM d, yyyy");
  const [compactMode, setCompactMode] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileName, setProfileName] = useState(
    displayName || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );

  useEffect(() => {
    const savedTheme = getStoredThemePreference();
    setThemeMode(savedTheme);
    setResolvedTheme(applyThemePreference(savedTheme, { persist: false }));
    setThemeReady(true);
    setPushNotifications(
      window.localStorage.getItem("jamal-push-notifications") !== "false",
    );
    setBiometricLogin(
      window.localStorage.getItem("jamal-biometric-login") === "true",
    );
    const savedCurrency = window.localStorage.getItem("jamal-currency");
    setCurrency(savedCurrency === "USD" ? "USD" : "PKR");
    setDateFormat(
      (window.localStorage.getItem("jamal-date-format") as DateFormat) ||
        "MMM d, yyyy",
    );
    setCompactMode(
      window.localStorage.getItem("jamal-compact-dashboard") === "true",
    );
  }, []);

  useEffect(() => {
    setProfileName(
      displayName || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
    );
  }, [displayName, email]);

  useEffect(() => {
    if (!themeReady) return;

    setResolvedTheme(applyThemePreference(themeMode));

    if (themeMode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      setResolvedTheme(applyThemePreference("system", { persist: false }));
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, [themeMode, themeReady]);

  function handleThemeChange(nextTheme: ThemeMode) {
    setThemeMode(nextTheme);
    toast.success(
      nextTheme === "system" ?
        "Theme now follows your system."
      : `${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`,
    );
  }

  function handlePushChange(next: boolean) {
    setPushNotifications(next);
    window.localStorage.setItem("jamal-push-notifications", String(next));
    toast.success(next ? "Notifications enabled." : "Notifications disabled.");
  }

  function handleBiometricChange(next: boolean) {
    setBiometricLogin(next);
    window.localStorage.setItem("jamal-biometric-login", String(next));
    toast.success(
      next ? "Biometric preference enabled." : "Biometric preference disabled.",
    );
  }

  function handlePreferencesSave(next: {
    currency: CurrencyCode;
    dateFormat: DateFormat;
    compactMode: boolean;
  }) {
    setCurrency(next.currency);
    setDateFormat(next.dateFormat);
    setCompactMode(next.compactMode);
    window.localStorage.setItem("jamal-currency", next.currency);
    window.localStorage.setItem("jamal-date-format", next.dateFormat);
    window.localStorage.setItem(
      "jamal-compact-dashboard",
      String(next.compactMode),
    );
    dispatchCurrencyChange(next.currency);
    toast.success("Preferences saved.");
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed out successfully.");
    router.replace("/login");
    router.refresh();
  }

  function handleExportData() {
    const payload = {
      userId,
      email,
      generatedAt: new Date().toISOString(),
      stats,
      preferences: {
        currency,
        dateFormat,
        compactMode,
        pushNotifications,
        biometricLogin,
        themeMode,
      },
      categories,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jamals-finance-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export downloaded.");
  }

  const metricCards = useMemo(
    () => [
      { value: stats.accounts, label: "Accounts" },
      { value: stats.transactions, label: "Transactions" },
      { value: stats.goals, label: "Goals" },
      { value: stats.investments, label: "Investments" },
    ],
    [stats],
  );

  return (
    <div className="min-h-full min-w-0 text-text-primary">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="mx-auto max-w-4xl space-y-5"
      >
        <div className="page-heading finance-surface-glass overflow-hidden">
          <div className="min-w-0">
            <h2 className="page-title">Settings</h2>
            <p className="page-subtitle">
              Account, theme, preferences, security, and data controls.
            </p>
          </div>
        </div>

        <section>
          <SectionTitle>Profile</SectionTitle>
          <SettingsCard>
            <div className="flex min-w-0 items-center gap-4 px-4 py-5 sm:px-5">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-active text-background shadow-theme">
                <UserRound size={30} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xl font-bold capitalize text-text-primary">
                  {profileName}
                </h3>
                <p className="mt-0.5 truncate text-sm text-text-secondary">
                  {email || "Active Supabase profile"}
                </p>
              </div>
              <span className="finance-state-pill hidden sm:inline-flex">
                Active
              </span>
            </div>
            <Divider />
            <ProfileDialog
              email={email}
              profileName={profileName}
              onProfileNameChange={setProfileName}
            />
            <Divider />
            <SecurityDialog email={email} />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Appearance</SectionTitle>
          <SettingsCard>
            <ThemeSelector
              value={themeMode}
              resolvedTheme={resolvedTheme}
              onChange={handleThemeChange}
            />
            <Divider />
            <SettingsRow
              icon={
                <IconBubble tone="violet">
                  <Palette size={21} />
                </IconBubble>
              }
              title="Theme Balance"
              description="Uses app-wide token colors, borders, and shadows"
              right={<span className="finance-state-pill">Synced</span>}
            />
            <Divider />
            <CategoriesDialog
              initialCategories={categories}
              initialUsage={categoryUsage}
              userId={userId}
            />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Notifications</SectionTitle>
          <SettingsCard>
            <SettingsRow
              icon={
                <IconBubble tone="blue">
                  <Bell size={21} />
                </IconBubble>
              }
              title="Push Notifications"
              description="Budget alerts, goals, insights"
              right={
                <SoftSwitch
                  checked={pushNotifications}
                  onCheckedChange={handlePushChange}
                  label="Toggle push notifications"
                />
              }
            />
            <Divider />
            <SettingsRow
              icon={
                <IconBubble tone="gray">
                  <Fingerprint size={21} />
                </IconBubble>
              }
              title="Biometric Login"
              description="Preference saved on this device"
              right={
                <SoftSwitch
                  checked={biometricLogin}
                  onCheckedChange={handleBiometricChange}
                  label="Toggle biometric login"
                />
              }
            />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Preferences</SectionTitle>
          <SettingsCard>
            <PreferencesDialog
              currency={currency}
              dateFormat={dateFormat}
              compactMode={compactMode}
              onSave={handlePreferencesSave}
            />
            <Divider />
            <SettingsRow
              icon={
                <IconBubble tone="green">
                  <WalletCards size={21} />
                </IconBubble>
              }
              title="Currency"
              description={`Current display preference: ${currency}`}
              right={<span className="finance-state-pill">{currency}</span>}
            />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Money Tools</SectionTitle>
          <SettingsCard>
            <Link
              href="/dashboard/payables"
              className="finance-focus flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover sm:px-5"
            >
              <IconBubble tone="green">
                <HandCoins size={21} />
              </IconBubble>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-5 text-text-primary">
                  Payables
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
                  Track money, items, return deadlines, and repayment history
                </span>
              </span>
              <ChevronRight size={18} className="text-text-secondary" />
            </Link>
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Data</SectionTitle>
          <SettingsCard>
            <SettingsRow
              icon={
                <IconBubble tone="blue">
                  <Download size={21} />
                </IconBubble>
              }
              title="Export Data"
              description="Download account settings snapshot"
              onClick={handleExportData}
              right={
                <span className="flex items-center gap-2 text-active">
                  <Download size={18} />
                  <ChevronRight size={18} className="text-text-secondary" />
                </span>
              }
            />
          </SettingsCard>
        </section>

        <section>
          <SectionTitle>Account Stats</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metricCards.map((metric) => (
              <div key={metric.label} className="summary-card min-w-0 text-center">
                <p className="text-2xl font-black text-active">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-secondary">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="finance-focus flex w-full items-center justify-center gap-2 rounded-[var(--oneui-control-radius)] border border-danger/30 bg-danger/10 px-4 py-4 text-sm font-bold text-danger hover:bg-hover disabled:opacity-60"
        >
          {isSigningOut ?
            <>
              <Loader2 className="animate-spin" size={18} />
              Signing Out...
            </>
          : <>
              <LogOut size={18} />
              Sign Out
            </>
          }
        </button>

        <footer className="pb-3 text-center text-xs leading-6 text-text-secondary">
          <p>Jamal&apos;s Finance OS - v2.0.0</p>
          <p>Theme and controls synced for this device</p>
        </footer>
      </motion.div>
    </div>
  );
}
