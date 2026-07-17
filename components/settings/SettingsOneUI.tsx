"use client";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  BellRing,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeModalContentClass,
  financeFieldHintClass,
} from "@/components/ui/finance-modal";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase/client";
import {
  buildSettingsSnapshot,
  CATEGORY_DELETE_VERIFICATION_ERROR,
  mapAuthError,
  validateCategoryDeleteReadiness,
  validatePasswordChange,
  validateProfileName,
} from "@/lib/settings/security";
import {
  applyThemePreference,
  getStoredThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";
import {
  CATEGORY_COLOR_PALETTE,
  CATEGORY_FALLBACK_COLORS,
  getReadableTextColor,
} from "@/lib/theme-colors";

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
  accounts: number | null;
  transactions: number | null;
  goals: number | null;
  investments: number | null;
}

interface SettingsOneUIProps {
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
}

interface SettingsRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  right?: ReactNode;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<CategoryKind, string> = {
  ...CATEGORY_FALLBACK_COLORS,
};

const ROOT_CATEGORY_VALUE = "__root__";

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
    icon: <Monitor size={16} aria-hidden="true" />,
  },
  {
    value: "light",
    label: "Light",
    description: "Bright finance workspace",
    icon: <Sun size={16} aria-hidden="true" />,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Dim finance workspace",
    icon: <Moon size={16} aria-hidden="true" />,
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

function AppearanceThemeControl({
  value,
  resolvedTheme,
  onChange,
}: {
  value: ThemeMode;
  resolvedTheme: ResolvedTheme;
  onChange: (value: ThemeMode) => void;
}) {
  function handleRadioKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const lastIndex = THEME_OPTIONS.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    onChange(THEME_OPTIONS[nextIndex].value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  }

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
          <p
            className="mt-0.5 text-xs leading-5 text-text-secondary"
            aria-live="polite"
            aria-atomic="true"
          >
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
        {THEME_OPTIONS.map((option, index) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleRadioKeyDown(event, index)}
              className={`finance-focus flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--oneui-control-radius)] border px-3 py-3 text-left transition-colors ${
                active ?
                  "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] border border-current/20 bg-card">
                {option.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-[11px] font-semibold leading-4 opacity-75">
                  {option.description}
                </span>
              </span>
              {active ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                  <Check size={14} aria-hidden="true" />
                  <span className="hidden min-[360px]:inline">Selected</span>
                </span>
              ) : null}
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
    const validation = validateProfileName(draftName);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const name = validation.value;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, name },
    });
    setSaving(false);

    if (error) {
      toast.error(
        mapAuthError(error, "Could not update your profile. Please try again."),
      );
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
            <UserRound size={21} />
          </IconBubble>
        }
        title="Profile details"
        description="Update your display name and review your sign-in email"
        onClick={() => setOpen(true)}
      />
      <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}>
        <FinanceModalHeader
          title="Profile Settings"
          description="Update the name shown across the app. Your sign-in email stays read-only."
          icon={UserRound}
          tone="info"
        />
        <FinanceModalBody>
          <form
            id="profile-settings-form"
            onSubmit={handleProfileSave}
            className="space-y-4"
          >
            <FinanceFormField label="Display name" htmlFor="display-name">
            <Input
              id="display-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Your display name"
              autoComplete="name"
            />
            </FinanceFormField>
            <FinanceFormField
              label="Email"
              htmlFor="profile-email"
              hint="Email changes are managed through your authenticated account."
            >
              <Input id="profile-email" value={email} disabled autoComplete="email" />
            </FinanceFormField>
          </form>
        </FinanceModalBody>
        <FinanceModalFooter>
          <Button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className={financeCancelButtonClass}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="profile-settings-form"
            loading={saving}
            loadingLabel="Saving..."
            className="primary-action w-full"
            size="lg"
          >
            <Save size={16} />
            Save Profile
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecurityDialog({ email }: { email: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [confirmOtherSignOut, setConfirmOtherSignOut] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);

  function resetSecurityState() {
    setStage("request");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setPasswordFeedback(null);
    setSessionFeedback(null);
    setConfirmOtherSignOut(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (isSendingCode || isUpdatingPassword || isSigningOutOthers)) {
      return;
    }
    setOpen(nextOpen);
    if (!nextOpen) resetSecurityState();
  }

  async function sendVerificationCode() {
    if (isSendingCode) return;
    setIsSendingCode(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.reauthenticate();
    setIsSendingCode(false);

    if (error) {
      setPasswordFeedback({
        tone: "error",
        message: mapAuthError(
          error,
          "Could not send a verification code. Please try again.",
        ),
      });
      return;
    }

    setStage("verify");
    setPasswordFeedback({
      tone: "success",
      message: "Verification code sent. Check your configured email or phone.",
    });
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUpdatingPassword) return;

    const validation = validatePasswordChange({
      verificationCode,
      newPassword,
      confirmPassword,
    });
    if (!validation.ok) {
      setPasswordFeedback({ tone: "error", message: validation.error });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.updateUser({
      password: validation.value.newPassword,
      nonce: validation.value.verificationCode,
    });

    if (error) {
      setIsUpdatingPassword(false);
      setPasswordFeedback({
        tone: "error",
        message: mapAuthError(
          error,
          "Could not update your password. Check the code and try again.",
        ),
      });
      return;
    }

    const { error: revokeError } = await supabase.auth.signOut({
      scope: "others",
    });
    setIsUpdatingPassword(false);
    resetSecurityState();

    if (revokeError) {
      toast.warning(
        "Password updated, but other sessions could not be revoked. Your current device remains signed in.",
      );
      return;
    }

    toast.success("Password updated and other devices signed out.");
  }

  async function signOutOtherDevices() {
    if (isSigningOutOthers) return;
    setIsSigningOutOthers(true);
    setSessionFeedback(null);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setIsSigningOutOthers(false);

    if (error) {
      setSessionFeedback(
        mapAuthError(
          error,
          "Could not sign out other devices. Please try again.",
        ),
      );
      return;
    }

    setConfirmOtherSignOut(false);
    setSessionFeedback("Other devices have been signed out.");
    toast.success("Other devices signed out. This device remains signed in.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <SettingsRow
        icon={
          <IconBubble tone="gray">
            <LockKeyhole size={21} />
          </IconBubble>
        }
        title="Security"
        description="Password verification and session controls"
        onClick={() => setOpen(true)}
      />
      <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}>
        <FinanceModalHeader
          title="Security"
          description={`Update password verification and session controls for ${email || "this profile"}.`}
          icon={LockKeyhole}
          tone="info"
        />

        <FinanceModalBody className="space-y-4">

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
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
                  Verify your identity before choosing a new password.
                </p>
              </div>
            </div>
            {stage === "request" ?
              <div className="space-y-3">
                <p className="text-xs leading-5 text-text-secondary">
                  Supabase will send a verification code to the email or phone
                  configured for your authenticated account.
                </p>
                <Button
                  type="button"
                  onClick={sendVerificationCode}
                  disabled={isSendingCode}
                  aria-busy={isSendingCode}
                  className="w-full"
                  size="lg"
                >
                  {isSendingCode && <Loader2 className="animate-spin" size={16} />}
                  {isSendingCode ? "Sending..." : "Send verification code"}
                </Button>
              </div>
            : <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <FinanceFormField label="Verification code" htmlFor="verification-code">
                  <Input
                    id="verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter verification code"
                  />
                </FinanceFormField>
                <FinanceFormField label="New password" htmlFor="new-password">
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((visible) => !visible)}
                      className="finance-focus absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-text-secondary"
                      aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FinanceFormField>
                <FinanceFormField label="Confirm new password" htmlFor="confirm-new-password">
                  <Input
                    id="confirm-new-password"
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat new password"
                  />
                </FinanceFormField>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendVerificationCode}
                    disabled={isSendingCode || isUpdatingPassword}
                    aria-busy={isSendingCode}
                    className="flex-1"
                  >
                    {isSendingCode ? "Resending..." : "Resend code"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword || isSendingCode}
                    aria-busy={isUpdatingPassword}
                    className="flex-1"
                  >
                    {isUpdatingPassword && <Loader2 className="animate-spin" size={16} />}
                    {isUpdatingPassword ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            }
            {passwordFeedback && (
              <p
                role={passwordFeedback.tone === "error" ? "alert" : undefined}
                aria-live="polite"
                className={`mt-3 text-xs font-semibold ${
                  passwordFeedback.tone === "error" ? "text-danger" : "text-success"
                }`}
              >
                {passwordFeedback.message}
              </p>
            )}
          </div>
        </motion.div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-text-primary">Other sessions</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Sign out every other device while keeping this device signed in.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSessionFeedback(null);
              setConfirmOtherSignOut(true);
            }}
            disabled={isSigningOutOthers || isUpdatingPassword}
            className="mt-3 w-full"
          >
            <LogOut size={16} />
            Sign out other devices
          </Button>
          {sessionFeedback && (
            <p aria-live="polite" className="mt-3 text-xs font-semibold text-text-secondary">
              {sessionFeedback}
            </p>
          )}
        </div>

        <Dialog
          open={confirmOtherSignOut}
          onOpenChange={(nextOpen) => {
            if (!isSigningOutOthers) setConfirmOtherSignOut(nextOpen);
          }}
        >
          <DialogContent className="rounded-3xl p-5 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign out other devices?</DialogTitle>
              <DialogDescription>
                Other sessions will be revoked. This device will remain signed in.
              </DialogDescription>
            </DialogHeader>
            {sessionFeedback && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {sessionFeedback}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOtherSignOut(false)}
                disabled={isSigningOutOthers}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={signOutOtherDevices}
                disabled={isSigningOutOthers}
                aria-busy={isSigningOutOthers}
                className="bg-danger text-[var(--status-foreground)] hover:bg-danger/90"
              >
                {isSigningOutOthers && <Loader2 className="animate-spin" size={16} />}
                {isSigningOutOthers ? "Signing out..." : "Sign out other devices"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </FinanceModalBody>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesDialog({
  initialCategories,
  initialUsage,
  userId,
  available,
}: {
  initialCategories: SettingsCategory[];
  initialUsage: Record<string, number>;
  userId: string;
  available: boolean;
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
  const [pendingDelete, setPendingDelete] =
    useState<SettingsCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

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
      toast.error("Could not add category. Please try again.");
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
      .eq("user_id", userId)
      .select("id, name, type, color, parent_id")
      .single();
    setSavingId(null);

    if (error || !data) {
      toast.error("Could not update category. Please try again.");
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
        const referencesUnavailable =
          readiness.error === CATEGORY_DELETE_VERIFICATION_ERROR;

        if (referencesUnavailable) {
          setDeleteFeedback(CATEGORY_DELETE_VERIFICATION_ERROR);
          return;
        }

        toast.error(readiness.error);
        setPendingDelete(null);
        setDeleteFeedback(null);
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

      if (
        deleteError ||
        !deletedCategory ||
        deletedCategory.id !== category.id
      ) {
        setDeleteFeedback("Could not delete category. Please try again.");
        router.refresh();
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
      setDeleteFeedback(null);
      toast.success(`${category.name} removed.`);
      router.refresh();
    } catch {
      setDeleteFeedback("Could not verify or delete category. Please try again.");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  function cancelCategoryDelete() {
    if (isDeletingCategory) return;
    setPendingDelete(null);
    setDeleteFeedback(null);
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
          {CATEGORY_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`Pick ${color}`}
              aria-pressed={value === color}
              className="finance-focus grid h-8 w-8 place-items-center rounded-full border border-border transition-transform hover:scale-105"
              style={{
                backgroundColor: color,
                color: getReadableTextColor(color),
                boxShadow:
                  value === color ?
                    "0 0 0 3px var(--card), 0 0 0 5px var(--active)"
                  : "0 0 0 3px color-mix(in srgb, var(--card), transparent 18%)",
              }}
            >
              {value === color && (
                <Check
                  size={14}
                  className="drop-shadow-sm"
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
    const selectValue =
      type === "income" ? ROOT_CATEGORY_VALUE : value || ROOT_CATEGORY_VALUE;

    if (type === "income") {
      return (
        <FinanceFormField label="Parent/root" htmlFor={id}>
          <Select value={ROOT_CATEGORY_VALUE} disabled>
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
              <SelectItem value={ROOT_CATEGORY_VALUE}>Root category</SelectItem>
            </SelectContent>
          </Select>
        </FinanceFormField>
      );
    }

    return (
      <FinanceFormField label="Parent/root" htmlFor={id}>
        <Select
          value={selectValue}
          onValueChange={(nextValue) => {
            if (!nextValue) return;
            onChange(nextValue === ROOT_CATEGORY_VALUE ? "" : nextValue);
          }}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
            <SelectItem value={ROOT_CATEGORY_VALUE}>Root category</SelectItem>
            {expenseRoots
              .filter((root) => root.id !== excludeId)
              .map((root) => (
                <SelectItem key={root.id} value={root.id}>
                  {root.name}
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
          <FinanceFormField label="Type" htmlFor={`edit-type-${category.id}`}>
            <Select
              value={editType}
              disabled={!canEditStructure}
              onValueChange={(value) => {
                if (!value) return;
                const nextType = value as CategoryKind;
                setEditType(nextType);
                if (nextType === "income") setEditParentId("");
              }}
            >
              <SelectTrigger id={`edit-type-${category.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </FinanceFormField>
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
              onClick={() => requestCategoryDelete(category)}
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

  if (!available) {
    return (
      <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-5">
        <IconBubble tone="violet">
          <Tags size={21} />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-text-primary">Categories</p>
          <p role="alert" className="mt-0.5 text-xs leading-5 text-danger">
            Category management is unavailable because settings data could not be loaded.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
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
      <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:42rem]`}>
        <FinanceModalHeader
          title="Categories"
          description="Add, edit, recolor, organize, and safely delete categories."
          icon={Tags}
          tone="info"
        />

        <FinanceModalBody>
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
                className="rounded-[var(--oneui-card-radius)] border border-border bg-surface-secondary p-4"
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
            className="space-y-3 rounded-[var(--oneui-card-radius)] border border-border bg-card p-3"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <FinanceFormField
                label="Add custom category"
                htmlFor="category-name"
                className="min-w-0"
              >
                <Input
                  id="category-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={`New ${activeTab} category`}
                />
              </FinanceFormField>
              <FinanceFormField label="Type" htmlFor="category-type">
                <Select
                  value={activeTab}
                  onValueChange={(value) => {
                    if (!value) return;
                    const nextType = value as CategoryKind;
                    setActiveTab(nextType);
                    resetDraft(nextType);
                  }}
                >
                  <SelectTrigger id="category-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </FinanceFormField>
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
        </FinanceModalBody>
      </DialogContent>
    </Dialog>
    <Dialog
      open={pendingDelete !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) cancelCategoryDelete();
      }}
    >
      <DialogContent
        className="rounded-3xl p-5 sm:max-w-md"
        showCloseButton={!isDeletingCategory}
      >
        <DialogHeader>
          <DialogTitle>Delete {pendingDelete?.name}?</DialogTitle>
          <DialogDescription>
            This category will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {deleteFeedback && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {deleteFeedback}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={cancelCategoryDelete}
            disabled={isDeletingCategory}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={confirmCategoryDelete}
            disabled={isDeletingCategory}
            aria-busy={isDeletingCategory}
            className="bg-danger text-[var(--status-foreground)] hover:bg-danger/90"
          >
            {isDeletingCategory && <Loader2 className="animate-spin" size={16} />}
            {isDeletingCategory ? "Verifying..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
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
  const { rateLabel } = useCurrency();
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
      <DialogContent className={financeModalContentClass}>
        <FinanceModalHeader
          title="Preferences"
          description="Control display defaults for this device."
          icon={SlidersHorizontal}
          tone="success"
        />

        <FinanceModalBody>
          <FinanceFormField
            label="Currency"
            htmlFor="preferences-currency"
            hint={rateLabel}
          >
            <Select
              value={draftCurrency}
              onValueChange={(value) => setDraftCurrency(value as CurrencyCode)}
            >
              <SelectTrigger
                id="preferences-currency"
                aria-label="Currency"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                <SelectItem value="PKR">PKR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </FinanceFormField>

          <FinanceFormField label="Date format" htmlFor="preferences-date-format">
            <Select
              value={draftDateFormat}
              onValueChange={(value) =>
                setDraftDateFormat(value as DateFormat)
              }
            >
              <SelectTrigger
                id="preferences-date-format"
                aria-label="Date format"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                <SelectItem value="MMM d, yyyy">Jun 22, 2026</SelectItem>
                <SelectItem value="dd MMM yyyy">22 Jun 2026</SelectItem>
                <SelectItem value="yyyy-MM-dd">2026-06-22</SelectItem>
              </SelectContent>
            </Select>
          </FinanceFormField>

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
          <p className={financeFieldHintClass}>
            These preferences are saved on this device.
          </p>
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <Button onClick={handleSave} className="min-h-[var(--oneui-control-height-lg)] w-full" size="lg">
            <Save size={16} />
            Save Preferences
          </Button>
        </FinanceModalFooter>
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
  categoriesAvailable,
  stats,
  notificationPreferences: initialNotificationPreferences,
  notificationPreferencesAvailable,
}: SettingsOneUIProps) {
  const router = useRouter();
  const supabase = createClient();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [themeReady, setThemeReady] = useState(false);
  const { currency, setCurrency: setGlobalCurrency } = useCurrency();
  const [dateFormat, setDateFormat] = useState<DateFormat>("MMM d, yyyy");
  const [compactMode, setCompactMode] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileName, setProfileName] = useState(
    displayName || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );
  const [notificationPreferences, setNotificationPreferences] = useState(
    initialNotificationPreferences,
  );

  useEffect(() => {
    const savedTheme = getStoredThemePreference();
    setThemeMode(savedTheme);
    setResolvedTheme(applyThemePreference(savedTheme, { persist: false }));
    setThemeReady(true);
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
    setNotificationPreferences(initialNotificationPreferences);
  }, [initialNotificationPreferences]);

  useEffect(() => {
    function handleThemeStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;

      const storedTheme = getStoredThemePreference();
      setThemeMode(storedTheme);
      setResolvedTheme(
        applyThemePreference(storedTheme, { persist: false }),
      );
    }

    window.addEventListener("storage", handleThemeStorage);
    return () => window.removeEventListener("storage", handleThemeStorage);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

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
    setResolvedTheme(applyThemePreference(nextTheme));
    toast.success(
      nextTheme === "system" ?
        "Theme now follows your system."
      : `${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`,
    );
  }

  function handlePreferencesSave(next: {
    currency: CurrencyCode;
    dateFormat: DateFormat;
    compactMode: boolean;
  }) {
    setGlobalCurrency(next.currency);
    setDateFormat(next.dateFormat);
    setCompactMode(next.compactMode);
    window.localStorage.setItem("jamal-date-format", next.dateFormat);
    window.localStorage.setItem(
      "jamal-compact-dashboard",
      String(next.compactMode),
    );
    toast.success("Preferences saved.");
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setIsSigningOut(false);

    if (error) {
      toast.error(mapAuthError(error, "Could not sign out this device. Please try again."));
      return;
    }

    toast.success("Signed out successfully.");
    router.replace("/login");
    router.refresh();
  }

  async function handleNotificationPreference(
    key: "goal_alerts_enabled" | "payable_alerts_enabled",
    checked: boolean,
  ) {
    if (!notificationPreferencesAvailable) return;

    const previous = notificationPreferences;
    const next = { ...previous, [key]: checked };
    setNotificationPreferences(next);

    const { error } = await supabase.from("notification_preferences").upsert(
      {
        user_id: userId,
        ...next,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setNotificationPreferences(previous);
      toast.error(
        mapAuthError(error, "Notification preference could not be saved. Try again."),
      );
      return;
    }

    toast.success("Notification preferences saved.");
    router.refresh();
  }

  function handleExportSettingsSnapshot() {
    const generatedAt = new Date();
    const payload = buildSettingsSnapshot({
      generatedAt: generatedAt.toISOString(),
      email,
      displayName: profileName,
      preferences: {
        currency,
        dateFormat,
        compactMode,
        themeMode,
      },
      categories: categoriesAvailable ? categories : null,
      stats,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = `jamals-finance-settings-${generatedAt.toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Settings snapshot downloaded.");
    } finally {
      window.URL.revokeObjectURL(url);
    }
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
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground shadow-theme">
                <UserRound size={30} aria-hidden="true" />
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
            <AppearanceThemeControl
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
              available={categoriesAvailable}
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

        <section id="notifications" className="scroll-mt-6">
          <SectionTitle>Notifications</SectionTitle>
          <SettingsCard>
            {notificationPreferencesAvailable ? (
              <>
                <SettingsRow
                  icon={
                    <IconBubble tone="violet">
                      <BellRing size={21} />
                    </IconBubble>
                  }
                  title="Goal deadline alerts"
                  description="Show due-soon and overdue alerts for unfinished goals"
                  right={
                    <SoftSwitch
                      checked={notificationPreferences.goal_alerts_enabled}
                      onCheckedChange={(checked) =>
                        void handleNotificationPreference("goal_alerts_enabled", checked)
                      }
                      label="Goal deadline alerts"
                    />
                  }
                />
                <Divider />
                <SettingsRow
                  icon={
                    <IconBubble tone="blue">
                      <BellRing size={21} />
                    </IconBubble>
                  }
                  title="Payable due alerts"
                  description="Show due-soon and overdue alerts for outstanding payables"
                  right={
                    <SoftSwitch
                      checked={notificationPreferences.payable_alerts_enabled}
                      onCheckedChange={(checked) =>
                        void handleNotificationPreference("payable_alerts_enabled", checked)
                      }
                      label="Payable due alerts"
                    />
                  }
                />
              </>
            ) : (
              <SettingsRow
                icon={
                  <IconBubble tone="gray">
                    <BellRing size={21} />
                  </IconBubble>
                }
                title="Notification preferences unavailable"
                description="Refresh Settings when your connection is stable. Existing preferences were not changed."
                right={<span className="finance-state-pill">Unavailable</span>}
              />
            )}
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
              title="Export Settings Snapshot"
              description="Includes profile email/display information, display preferences, category configuration, and an account statistics summary"
              onClick={handleExportSettingsSnapshot}
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
                  {metric.value ?? "—"}
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
          aria-busy={isSigningOut}
          className="finance-focus flex w-full items-center justify-center gap-2 rounded-[var(--oneui-control-radius)] border border-danger/30 bg-danger/10 px-4 py-4 text-sm font-bold text-danger hover:bg-hover disabled:opacity-60"
        >
          {isSigningOut ?
            <>
              <Loader2 className="animate-spin" size={18} />
              Signing Out...
            </>
          : <>
              <LogOut size={18} />
              Sign out this device
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
