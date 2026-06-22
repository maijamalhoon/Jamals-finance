"use client";

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
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  Plus,
  ShieldCheck,
  Tags,
  UserRound,
  WalletCards,
  X,
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

export interface Category {
  id: string;
  name: string;
}

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

interface SecurityFormState {
  currentPassword: string;
  newPassword: string;
}

const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: "income-salary", name: "Salary" },
  { id: "income-business", name: "Business" },
  { id: "income-investments", name: "Investments" },
];

const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: "expense-food", name: "Food" },
  { id: "expense-transport", name: "Transport" },
  { id: "expense-bills", name: "Bills" },
  { id: "expense-shopping", name: "Shopping" },
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
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    gray: "bg-slate-100 text-slate-500",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-theme">
      {children}
    </div>
  );
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
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover sm:px-5"
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
        checked
          ? "border-active bg-active"
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

function createCategoryId(kind: CategoryKind, name: string): string {
  return `${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

function mergeCategoryDefaults(
  defaults: Category[],
  initialCategories: SettingsCategory[],
  kind: CategoryKind,
): Category[] {
  const initial = initialCategories
    .filter((category) => category.type === kind)
    .map<Category>((category) => ({
      id: category.id,
      name: category.name,
    }));
  const seen = new Set<string>();
  return [...initial, ...defaults].filter((category) => {
    const key = category.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SecurityDialog({ email }: { email: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<SecurityFormState>({
    currentPassword: "",
    newPassword: "",
  });

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.currentPassword.trim() || !form.newPassword.trim()) {
      toast.error("Enter your current and new password.");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: form.newPassword,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setForm({ currentPassword: "", newPassword: "" });
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
        description="Password, 2FA"
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
                  value={form.currentPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
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
                  value={form.newPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full"
            >
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
              Two-Factor Authentication (2FA)
            </p>
            <p className="text-xs text-text-secondary">
              HOLD: local toggle only, backend enrollment coming later.
            </p>
          </div>
          <SoftSwitch
            checked={twoFactorEnabled}
            onCheckedChange={setTwoFactorEnabled}
            label="Toggle two-factor authentication"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesDialog({
  initialCategories,
}: {
  initialCategories: SettingsCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryKind>("income");
  const [incomeCategories, setIncomeCategories] = useState<Category[]>(() =>
    mergeCategoryDefaults(
      DEFAULT_INCOME_CATEGORIES,
      initialCategories,
      "income",
    ),
  );
  const [expenseCategories, setExpenseCategories] = useState<Category[]>(() =>
    mergeCategoryDefaults(
      DEFAULT_EXPENSE_CATEGORIES,
      initialCategories,
      "expense",
    ),
  );
  const [draftName, setDraftName] = useState("");

  const activeCategories =
    activeTab === "income" ? incomeCategories : expenseCategories;
  const setActiveCategories =
    activeTab === "income" ? setIncomeCategories : setExpenseCategories;

  function addCategory(event: FormEvent<HTMLFormElement>) {
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
    setActiveCategories((current) => [
      ...current,
      { id: createCategoryId(activeTab, name), name },
    ]);
    setDraftName("");
    toast.success(`${name} added.`);
  }

  function removeCategory(categoryId: string, categoryName: string) {
    setActiveCategories((current) =>
      current.filter((category) => category.id !== categoryId),
    );
    toast.success(`${categoryName} removed.`);
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
            Organize custom labels used across income and expense tracking.
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
            <TabsTrigger value="income">Income Categories</TabsTrigger>
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
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
                  {activeTab === "income"
                    ? "Income Categories"
                    : "Expense Categories"}
                </p>
                <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                  {activeCategories.length}
                </span>
              </div>

              <div className="flex min-h-28 flex-wrap content-start gap-2">
                {activeCategories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="outline"
                    className="h-9 gap-2 rounded-full bg-card px-3 text-sm font-semibold"
                  >
                    {category.name}
                    <button
                      type="button"
                      onClick={() => removeCategory(category.id, category.name)}
                      className="grid h-5 w-5 place-items-center rounded-full text-text-secondary hover:bg-hover hover:text-text-primary"
                      aria-label={`Remove ${category.name}`}
                    >
                      <X size={13} />
                    </button>
                  </Badge>
                ))}
              </div>
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
          <Button type="submit" disabled={!draftName.trim()}>
            <Plus size={16} />
            Add
          </Button>
        </form>
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
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("jamal-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeMode(savedTheme === "dark" || (!savedTheme && prefersDark) ? "dark" : "light");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const shouldUseDark = themeMode === "dark";
    root.classList.toggle("dark", shouldUseDark);
    root.style.colorScheme = shouldUseDark ? "dark" : "light";
    window.localStorage.setItem("jamal-theme", themeMode);
  }, [themeMode]);

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
    const toastId = toast.loading("Preparing mock export...");
    console.log("Mock export requested", { userId, generatedAt: new Date().toISOString() });
    window.setTimeout(() => {
      toast.dismiss(toastId);
      toast.success("Mock export ready. Download service is stubbed.");
    }, 650);
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

  const profileName =
    displayName || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal";

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
            Samsung One UI controls for Jamal&apos;s Finance.
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
              <button
                type="button"
                aria-label={`Edit profile for ${profileName}`}
                className="rounded-full bg-surface-secondary px-4 py-2 text-sm font-bold text-text-primary hover:bg-hover"
              >
                Edit
              </button>
            </div>
            <Divider />
            <SettingsRow
              icon={
                <IconBubble tone="blue">
                  <Mail size={21} />
                </IconBubble>
              }
              title="Account Details"
              description={email || "Name, email, phone"}
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
              title="Light Mode"
              description={
                themeMode === "light"
                  ? "Light theme is active"
                  : "Dark theme is active"
              }
              right={
                <SoftSwitch
                  checked={themeMode === "light"}
                  onCheckedChange={(checked) =>
                    setThemeMode(checked ? "light" : "dark")
                  }
                  label="Toggle display theme"
                />
              }
            />
            <Divider />
            <SettingsRow
              icon={
                <IconBubble tone="green">
                  <WalletCards size={21} />
                </IconBubble>
              }
              title="Currency"
              description="Current: PKR"
              right={
                <span className="flex items-center gap-1 text-sm font-bold text-text-secondary">
                  PKR <ChevronRight size={18} />
                </span>
              }
            />
            <Divider />
            <CategoriesDialog initialCategories={categories} />
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
                  onCheckedChange={setPushNotifications}
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
              description="HOLD: local UI toggle only"
              right={
                <SoftSwitch
                  checked={biometricLogin}
                  onCheckedChange={setBiometricLogin}
                  label="Toggle biometric login"
                />
              }
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
              description="Download CSV or PDF report"
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
              <div
                key={metric.label}
                className="rounded-3xl border border-border bg-card px-3 py-4 text-center shadow-theme"
              >
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
          {isSigningOut ? (
            "Signing Out..."
          ) : (
            <>
              <LogOut size={18} />
              Sign Out
            </>
          )}
        </button>

        <footer className="pb-3 text-center text-xs leading-6 text-text-secondary">
          <p>Jamal&apos;s Finance OS - v2.0.0</p>
          <p>Samsung One UI 8.5 Design</p>
        </footer>
      </motion.div>
    </div>
  );
}
