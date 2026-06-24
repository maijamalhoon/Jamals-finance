"use client";
import ExportButton from "@/components/reports/ExportButton";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Download,
  Fingerprint,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { createClient } from "@/lib/supabase/client";

type CategoryKind = "income" | "expense";
type ThemeMode = "light" | "dark";
type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";

export interface SettingsCategory {
  id: string;
  name: string;
  type: CategoryKind;
  color: string | null;
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
    blue: "text-blue-600",
    green: "text-emerald-600",
    red: "text-red-600",
    gray: "text-text-secondary",
    violet: "text-violet-600",
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
  return <div className="finance-panel overflow-hidden">{children}</div>;
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
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover sm:px-5"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover sm:px-5">
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
      className={`relative h-8 w-14 rounded-full border transition-colors ${
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
      <SettingsRow
        icon={
          <IconBubble tone="blue">
            <Download size={21} />
          </IconBubble>
        }
        title="Export Data"
        description="Download profile backup JSON or full transactions CSV"
        right={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleExportData}
              className="finance-control finance-focus inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-primary"
            >
              <Download size={15} />
              Backup JSON
            </button>

            <ExportButton />
          </div>
        }
      />
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
  userId,
}: {
  initialCategories: SettingsCategory[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [categories, setCategories] =
    useState<SettingsCategory[]>(initialCategories);
  const [draftName, setDraftName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.type === activeTab),
    [activeTab, categories],
  );

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    const exists = activeCategories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      toast.error(`${name} already exists.`);
      return;
    }

    setSavingId("new");
    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        type: activeTab,
        color: CATEGORY_COLORS[activeTab],
      })
      .select("id, name, type, color")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error(error?.message || "Could not add category.");
      return;
    }

    setCategories((current) => [...current, data as SettingsCategory]);
    setDraftName("");
    toast.success(`${name} added.`);
    router.refresh();
  }

  async function removeCategory(category: SettingsCategory) {
    if (
      !confirm(
        `Delete "${category.name}"? Existing transactions may still use it.`,
      )
    ) {
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
    toast.success(`${category.name} removed.`);
    router.refresh();
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
            Add and remove labels used across income and expense tracking.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as CategoryKind);
            setDraftName("");
          }}
        >
          <TabsList>
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
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
                  {activeTab === "income" ?
                    "Income Categories"
                  : "Expense Categories"}
                </p>
                <span className="finance-state-pill">
                  {activeCategories.length}
                </span>
              </div>

              {activeCategories.length === 0 ?
                <div className="rounded-[22px] border border-dashed border-border bg-card p-5 text-center">
                  <p className="text-sm font-semibold text-text-primary">
                    No {activeTab} categories yet
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Add one below and it will be available in transaction forms.
                  </p>
                </div>
              : <div className="flex min-h-28 flex-wrap content-start gap-2">
                  {activeCategories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="h-9 gap-2 rounded-full bg-card px-3 text-sm font-semibold"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            category.color ?? CATEGORY_COLORS[category.type],
                        }}
                      />
                      {category.name}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        disabled={savingId === category.id}
                        className="grid h-5 w-5 place-items-center rounded-full text-text-secondary hover:bg-hover hover:text-text-primary disabled:opacity-50"
                        aria-label={`Remove ${category.name}`}
                      >
                        {savingId === category.id ?
                          <Loader2 className="animate-spin" size={13} />
                        : <Trash2 size={13} />}
                      </button>
                    </Badge>
                  ))}
                </div>
              }
            </motion.div>
          </TabsContent>
        </Tabs>

        <form
          onSubmit={addCategory}
          className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
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
          <Button
            type="submit"
            disabled={!draftName.trim() || savingId === "new"}
            size="lg"
          >
            {savingId === "new" ?
              <Loader2 className="animate-spin" size={16} />
            : <Plus size={16} />}
            {savingId === "new" ? "Adding..." : "Add"}
          </Button>
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
  currency: string;
  dateFormat: DateFormat;
  compactMode: boolean;
  onSave: (next: {
    currency: string;
    dateFormat: DateFormat;
    compactMode: boolean;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftCurrency, setDraftCurrency] = useState(currency);
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
              onChange={(event) => setDraftCurrency(event.target.value)}
              className="field-input"
            >
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="GBP">GBP</option>
            </select>
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
  stats,
}: SettingsOneUIProps) {
  const router = useRouter();
  const supabase = createClient();
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(false);
  const [currency, setCurrency] = useState("PKR");
  const [dateFormat, setDateFormat] = useState<DateFormat>("MMM d, yyyy");
  const [compactMode, setCompactMode] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileName, setProfileName] = useState(
    displayName || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("jamal-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setThemeMode(
      savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light",
    );
    setPushNotifications(
      window.localStorage.getItem("jamal-push-notifications") !== "false",
    );
    setBiometricLogin(
      window.localStorage.getItem("jamal-biometric-login") === "true",
    );
    setCurrency(window.localStorage.getItem("jamal-currency") || "PKR");
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
    const root = document.documentElement;
    const shouldUseDark = themeMode === "dark";
    root.classList.toggle("dark", shouldUseDark);
    root.style.colorScheme = shouldUseDark ? "dark" : "light";
    window.localStorage.setItem("jamal-theme", themeMode);
  }, [themeMode]);

  function handleThemeChange(nextTheme: ThemeMode) {
    setThemeMode(nextTheme);
    toast.success(`${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`);
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
    currency: string;
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
    <div className="min-h-full rounded-[28px] bg-background px-3 py-4 text-text-primary sm:px-5 lg:px-7">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="mx-auto max-w-3xl space-y-5"
      >
        <div className="px-2">
          <h2 className="text-3xl font-bold tracking-normal text-text-primary">
            Settings
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Account, theme, preferences, security, and data controls.
          </p>
        </div>

        <section>
          <SectionTitle>Profile</SectionTitle>
          <SettingsCard>
            <div className="flex items-center gap-4 px-4 py-5 sm:px-5">
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
            <SettingsRow
              icon={
                <IconBubble tone="blue">
                  <Moon size={21} />
                </IconBubble>
              }
              title="Dark Mode"
              description={
                themeMode === "dark" ?
                  "Dark theme is active"
                : "Light theme is active"
              }
              right={
                <SoftSwitch
                  checked={themeMode === "dark"}
                  onCheckedChange={(checked) =>
                    handleThemeChange(checked ? "dark" : "light")
                  }
                  label="Toggle dark mode"
                />
              }
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
            <CategoriesDialog initialCategories={categories} userId={userId} />
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
              <div key={metric.label} className="summary-card text-center">
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
          className="flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-surface-secondary px-4 py-4 text-sm font-bold text-red-600 hover:bg-hover disabled:opacity-60"
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
