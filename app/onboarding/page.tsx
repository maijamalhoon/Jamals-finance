"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Landmark,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  AuthFeedback,
  AuthField,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { AuthFormSkeleton } from "@/components/loading/LoadingPrimitives";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  classifyAuthFailure,
  isSupabaseSessionCookie,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";
import { getUserMutationError } from "@/lib/user-errors";

type LoadState = "checking" | "ready" | "temporarily_unavailable";
type WorkspaceChoice = "undecided" | "personal" | "business";
type OnboardingStep = 1 | 2 | 3;
type ProfileField = "fullName" | "age";
type AccountField = "accountName" | "openingBalance";

type WorkspacePreference = {
  default_workspace: "personal" | "business";
  active_business_id: string | null;
  onboarding_choice: WorkspaceChoice;
};

const ONBOARDING_STEP_KEY_PREFIX = "jamal-onboarding-step";

function loginDestination(next: string, reason?: "session_expired") {
  const params = new URLSearchParams({ next });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

function getSavedStep(userId: string): OnboardingStep {
  try {
    const stored = Number(
      window.localStorage.getItem(`${ONBOARDING_STEP_KEY_PREFIX}:${userId}`),
    );

    if (stored === 1 || stored === 2) return stored;
    if (stored === 3 || stored === 4) return 3;
    return 1;
  } catch {
    return 1;
  }
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fullNameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const accountNameRef = useRef<HTMLInputElement>(null);
  const openingBalanceRef = useRef<HTMLInputElement>(null);
  const saveInFlight = useRef(false);

  const [workspaceChoice, setWorkspaceChoice] =
    useState<WorkspaceChoice>("undecided");
  const [step, setStep] = useState<OnboardingStep>(1);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [provider, setProvider] = useState("email");
  const [accountName, setAccountName] = useState("");
  const [accountKind, setAccountKind] = useState("savings");
  const [openingBalance, setOpeningBalance] = useState("");
  const [hasAccount, setHasAccount] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const [savingChoice, setSavingChoice] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<ProfileField, string>>
  >({});
  const [accountErrors, setAccountErrors] = useState<
    Partial<Record<AccountField, string>>
  >({});
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      setLoadState("checking");
      setLoadError("");
      const destination = sanitizeInternalRedirect(
        new URLSearchParams(window.location.search).get("next"),
      );
      setSafeNext(destination);

      let userResult;

      try {
        userResult = await supabase.auth.getUser();
      } catch {
        if (cancelled) return;
        setLoadError("Authentication is temporarily unavailable. Please try again.");
        setLoadState("temporarily_unavailable");
        return;
      }

      if (cancelled) return;
      const { data, error: userError } = userResult;

      if (userError) {
        const hasAuthCookies = document.cookie
          .split(";")
          .map((cookie) => cookie.trim().split("=")[0] ?? "")
          .some(isSupabaseSessionCookie);
        const failure = classifyAuthFailure(userError, hasAuthCookies);

        if (failure === "transient_failure") {
          setLoadError("Authentication is temporarily unavailable. Please try again.");
          setLoadState("temporarily_unavailable");
        } else {
          router.replace(
            loginDestination(
              destination,
              failure === "stale_session" ? "session_expired" : undefined,
            ),
          );
        }
        return;
      }

      if (!data.user) {
        router.replace(loginDestination(destination));
        return;
      }

      const user = data.user;
      setUserId(user.id);
      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string) ?? "");
      setProvider((user.app_metadata?.provider as string) ?? "email");

      try {
        const [profileResult, accountResult, preferenceResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, age, onboarding_completed")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("accounts").select("id").eq("user_id", user.id).limit(1),
          supabase
            .from("business_workspace_preferences")
            .select("default_workspace, active_business_id, onboarding_choice")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (profileResult.error || preferenceResult.error) {
          setLoadError("We could not load your workspace setup right now. Please try again.");
          setLoadState("temporarily_unavailable");
          return;
        }

        const profile = profileResult.data;
        const preference = preferenceResult.data as WorkspacePreference | null;

        if (profile?.onboarding_completed) {
          if (!preference || preference.onboarding_choice === "undecided") {
            await supabase.from("business_workspace_preferences").upsert({
              user_id: user.id,
              default_workspace: "personal",
              active_business_id: null,
              onboarding_choice: "personal",
              updated_at: new Date().toISOString(),
            });
            router.replace(destination);
            return;
          }

          if (preference.default_workspace === "business") {
            if (preference.active_business_id) {
              const businessResult = await supabase
                .from("businesses")
                .select("slug")
                .eq("id", preference.active_business_id)
                .maybeSingle();

              if (businessResult.data?.slug) {
                router.replace(`/business/${businessResult.data.slug}`);
                return;
              }
            }

            router.replace("/business");
            return;
          }

          router.replace(destination);
          return;
        }

        if (profile?.full_name) setFullName(profile.full_name);
        if (profile?.age !== null && profile?.age !== undefined) {
          setAge(String(profile.age));
        }

        const selectedChoice = preference?.onboarding_choice ?? "undecided";
        setWorkspaceChoice(selectedChoice);
        setHasAccount(!accountResult.error && Boolean(accountResult.data?.length));
        setStep(selectedChoice === "personal" ? getSavedStep(user.id) : 1);
        setLoadState("ready");
      } catch {
        if (cancelled) return;
        setLoadError("We could not load your workspace setup right now. Please try again.");
        setLoadState("temporarily_unavailable");
      }
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [retryCount, router, supabase]);

  async function chooseWorkspace(choice: Exclude<WorkspaceChoice, "undecided">) {
    if (!userId || savingChoice || saveInFlight.current) return;

    saveInFlight.current = true;
    setSavingChoice(true);
    setFormError("");

    try {
      const { error } = await supabase.from("business_workspace_preferences").upsert({
        user_id: userId,
        default_workspace: choice,
        active_business_id: null,
        onboarding_choice: choice,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setFormError("Your workspace choice could not be saved. Please try again.");
        return;
      }

      setWorkspaceChoice(choice);
      setStep(1);
    } catch {
      setFormError("Your workspace choice could not be saved. Check your connection and try again.");
    } finally {
      saveInFlight.current = false;
      setSavingChoice(false);
    }
  }

  function moveToStep(nextStep: OnboardingStep) {
    setFormError("");
    setStep(nextStep);
    try {
      window.localStorage.setItem(
        `${ONBOARDING_STEP_KEY_PREFIX}:${userId}`,
        String(nextStep),
      );
    } catch {
      // Progress still works for the current session when storage is unavailable.
    }
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  function clearProfileError(field: ProfileField) {
    setProfileErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function setProfileError(field: ProfileField, message: string) {
    setProfileErrors((current) => ({ ...current, [field]: message }));
    (field === "fullName" ? fullNameRef : ageRef).current?.focus();
  }

  function clearAccountError(field: AccountField) {
    setAccountErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function setAccountError(field: AccountField, message: string) {
    setAccountErrors((current) => ({ ...current, [field]: message }));
    (field === "accountName" ? accountNameRef : openingBalanceRef).current?.focus();
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (saveInFlight.current || savingProfile) return;

    setProfileErrors({});
    setFormError("");

    if (!fullName.trim()) {
      setProfileError("fullName", "Enter your full name.");
      return;
    }

    const numericAge = Number(age);
    if (!age || !Number.isInteger(numericAge) || numericAge < 10 || numericAge > 120) {
      setProfileError("age", "Enter a whole-number age from 10 to 120.");
      return;
    }

    saveInFlight.current = true;
    setSavingProfile(true);

    const businessFlow = workspaceChoice === "business";

    try {
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: fullName.trim(),
        age: numericAge,
        provider,
        onboarding_completed: businessFlow,
        updated_at: new Date().toISOString(),
      });

      if (saveError) {
        setFormError("We could not save your profile. Please try again.");
        return;
      }

      if (businessFlow) {
        try {
          window.localStorage.removeItem(`${ONBOARDING_STEP_KEY_PREFIX}:${userId}`);
        } catch {
          // The database remains authoritative when browser storage is unavailable.
        }
        router.replace("/business?setup=1");
        router.refresh();
        return;
      }

      moveToStep(2);
    } catch {
      setFormError("We could not save your profile. Please try again.");
    } finally {
      saveInFlight.current = false;
      setSavingProfile(false);
    }
  }

  async function handleAccountSubmit(event: FormEvent) {
    event.preventDefault();
    if (saveInFlight.current || savingAccount) return;

    if (hasAccount) {
      moveToStep(3);
      return;
    }

    setAccountErrors({});
    setFormError("");

    if (!accountName.trim()) {
      setAccountError("accountName", "Enter an account name or skip this step.");
      return;
    }

    const balance = openingBalance.trim() === "" ? 0 : Number(openingBalance);
    if (!Number.isFinite(balance)) {
      setAccountError("openingBalance", "Enter a valid opening balance.");
      return;
    }

    saveInFlight.current = true;
    setSavingAccount(true);

    try {
      const { error: accountError } = await supabase.from("accounts").insert({
        user_id: userId,
        name: accountName.trim(),
        type: "bank",
        account_kind: accountKind,
        icon_key: "bank",
        accent_color: "blue",
        balance,
      });

      if (accountError) {
        setFormError(
          getUserMutationError(accountError, "Account could not be created. Try again."),
        );
        return;
      }

      setHasAccount(true);
      moveToStep(3);
    } catch {
      setFormError("Account could not be created. Check your connection and try again.");
    } finally {
      saveInFlight.current = false;
      setSavingAccount(false);
    }
  }

  async function completeOnboarding() {
    if (saveInFlight.current || completing) return;
    saveInFlight.current = true;
    setCompleting(true);
    setFormError("");

    const numericAge = Number(age);

    try {
      const [profileResult, preferenceResult] = await Promise.all([
        supabase.from("profiles").upsert({
          id: userId,
          email,
          full_name: fullName.trim(),
          age: numericAge,
          provider,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("business_workspace_preferences").upsert({
          user_id: userId,
          default_workspace: "personal",
          active_business_id: null,
          onboarding_choice: "personal",
          updated_at: new Date().toISOString(),
        }),
      ]);

      if (profileResult.error || preferenceResult.error) {
        setFormError("We could not complete setup. Your progress is still saved.");
        return;
      }

      try {
        window.localStorage.removeItem(`${ONBOARDING_STEP_KEY_PREFIX}:${userId}`);
      } catch {
        // Completion is authoritative in the profile even when local storage is unavailable.
      }

      router.replace(safeNext);
      router.refresh();
    } catch {
      setFormError("We could not complete setup. Check your connection and try again.");
    } finally {
      saveInFlight.current = false;
      setCompleting(false);
    }
  }

  if (loadState !== "ready") {
    return (
      <AuthShell
        compact
        eyebrow={loadState === "checking" ? "Workspace setup" : "Temporary interruption"}
        progress={loadState === "checking" ? "Session check" : undefined}
        title={loadState === "checking" ? "Preparing your workspace" : "Setup could not load"}
        description={
          loadState === "checking"
            ? "We are confirming your session before showing your setup progress."
            : "This interruption is retryable, and your setup has not been marked complete."
        }
        icon={loadState === "checking" ? LoaderCircle : AlertTriangle}
      >
        {loadState === "checking" ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <AuthFeedback tone="info">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                Checking your session…
              </span>
            </AuthFeedback>
            <AuthFormSkeleton fields={2} />
          </div>
        ) : (
          <div className="space-y-4">
            <AuthFeedback tone="warning" role="alert">
              {loadError}
            </AuthFeedback>
            <Button
              type="button"
              onClick={() => setRetryCount((value) => value + 1)}
              size="lg"
              className="w-full"
            >
              Try again <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </AuthShell>
    );
  }

  if (workspaceChoice === "undecided") {
    return (
      <AuthShell
        eyebrow="Choose workspace"
        progress="One account · two workspaces"
        title="How will you use Jamal’s Finance?"
        description="Choose your starting workspace. Personal and business records remain completely separate."
        icon={ShieldCheck}
      >
        <div className="mx-auto w-full max-w-[42rem]">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={savingChoice}
              onClick={() => void chooseWorkspace("personal")}
              className="finance-focus group min-h-48 rounded-[var(--radius-card)] bg-surface-secondary p-5 text-left transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-60 sm:p-6"
            >
              <span className="grid size-12 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                <WalletCards className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-5 block text-lg font-black text-text-primary">
                Personal finance
              </span>
              <span className="mt-2 block text-sm leading-6 text-text-secondary">
                Accounts, income, expenses, goals, investments, payables, and personal reports.
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
                Start personal setup <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              disabled={savingChoice}
              onClick={() => void chooseWorkspace("business")}
              className="finance-focus group min-h-48 rounded-[var(--radius-card)] bg-surface-secondary p-5 text-left transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-60 sm:p-6"
            >
              <span className="grid size-12 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                <Building2 className="size-6" aria-hidden="true" />
              </span>
              <span className="mt-5 block text-lg font-black text-text-primary">
                Business management
              </span>
              <span className="mt-2 block text-sm leading-6 text-text-secondary">
                Tenant-isolated ERP, CRM, accounting, invoices, inventory, team roles, and reports.
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary">
                Start business setup <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </button>
          </div>

          <div className="auth-feedback-slot mt-3">
            {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
          </div>

          <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs leading-5 text-text-tertiary">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>You can use both workspaces and switch between them later.</span>
          </div>
        </div>
      </AuthShell>
    );
  }

  const providerLabel =
    provider === "google"
      ? "Google"
      : provider === "email"
        ? "Email and password"
        : "Connected account";
  const businessFlow = workspaceChoice === "business";

  const shellCopy = businessFlow
    ? {
        eyebrow: "Business setup",
        title: "Set up your account identity",
        description:
          "Next, add your company name and nature of business so the correct ERP modules can be prepared.",
        icon: Building2,
      }
    : {
        1: {
          eyebrow: "Welcome",
          title: "Let’s set up your personal workspace",
          description: "Add the essentials now. You can change every detail later from Settings.",
          icon: UserRound,
        },
        2: {
          eyebrow: "First account",
          title: hasAccount ? "Your account is ready" : "Add your first account",
          description: hasAccount
            ? "We found an existing account, so your balances already have a reliable starting point."
            : "This gives income, expenses, and transfers an accurate balance context.",
          icon: Landmark,
        },
        3: {
          eyebrow: "Ready",
          title: "You’re ready to start",
          description: "Your workspace is prepared for accurate transactions, balances, and reports.",
          icon: ShieldCheck,
        },
      }[step];

  const progressTotal = businessFlow ? 2 : 3;
  const progressStep = businessFlow ? 1 : step;

  return (
    <AuthShell
      eyebrow={shellCopy.eyebrow}
      progress={`Step ${progressStep} of ${progressTotal}`}
      title={shellCopy.title}
      description={shellCopy.description}
      icon={shellCopy.icon}
    >
      <div className="mx-auto w-full max-w-[38rem]">
        <div
          className={`mb-5 grid gap-2 ${businessFlow ? "grid-cols-2" : "grid-cols-3"}`}
          aria-label={`Onboarding progress: step ${progressStep} of ${progressTotal}`}
        >
          {Array.from({ length: progressTotal }, (_, index) => index + 1).map((item) => (
            <span
              key={item}
              className={`h-1.5 rounded-full ${item <= progressStep ? "bg-primary" : "bg-surface-secondary"}`}
              aria-hidden="true"
            />
          ))}
        </div>

        {step === 1 ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 w-fit"
              onClick={() => {
                setFormError("");
                setWorkspaceChoice("undecided");
              }}
              disabled={savingProfile}
            >
              <ArrowLeft className="h-4 w-4" /> Change workspace
            </Button>

            <dl className="auth-identity-summary" aria-label="Signed-in identity">
              <div>
                <dt>
                  <Mail className="h-4 w-4" aria-hidden="true" /> Email
                </dt>
                <dd>{email || "Signed-in account"}</dd>
              </div>
              <div>
                <dt>
                  <KeyRound className="h-4 w-4" aria-hidden="true" /> Sign-in method
                </dt>
                <dd>{providerLabel}</dd>
              </div>
            </dl>

            <form
              onSubmit={handleProfileSubmit}
              noValidate
              aria-busy={savingProfile}
              className="mt-4 space-y-1"
            >
              <AuthField
                id="onboarding-full-name"
                name="full_name"
                label="Full name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  clearProfileError("fullName");
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={savingProfile}
                error={profileErrors.fullName}
                inputRef={fullNameRef}
                icon={<UserRound className="h-4 w-4" />}
              />

              <AuthField
                id="onboarding-age"
                name="age"
                label="Age"
                value={age}
                onChange={(event) => {
                  setAge(event.target.value.replace(/\D/g, "").slice(0, 3));
                  clearProfileError("age");
                }}
                placeholder="Enter your age"
                inputMode="numeric"
                autoComplete="off"
                disabled={savingProfile}
                error={profileErrors.age}
                helper="Enter a whole number between 10 and 120."
                inputRef={ageRef}
              />

              <div className="auth-feedback-slot">
                {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
              </div>

              <AuthSubmitAction
                type="submit"
                loading={savingProfile}
                loadingLabel="Saving profile…"
                disabled={savingProfile}
              >
                {businessFlow ? "Continue to company setup" : "Continue"}{" "}
                <ArrowRight className="h-4 w-4" />
              </AuthSubmitAction>
            </form>
          </>
        ) : null}

        {!businessFlow && step === 2 ? (
          <form onSubmit={handleAccountSubmit} noValidate aria-busy={savingAccount}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 w-fit"
              onClick={() => moveToStep(1)}
              disabled={savingAccount}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {hasAccount ? (
              <AuthFeedback tone="success">
                <span className="inline-flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Your existing account will provide the balance context for your transactions.
                </span>
              </AuthFeedback>
            ) : (
              <div className="space-y-3">
                <AuthField
                  id="onboarding-account-name"
                  name="account_name"
                  label="Account name"
                  value={accountName}
                  onChange={(event) => {
                    setAccountName(event.target.value);
                    clearAccountError("accountName");
                  }}
                  placeholder="e.g. Main bank account"
                  autoComplete="off"
                  disabled={savingAccount}
                  error={accountErrors.accountName}
                  inputRef={accountNameRef}
                  icon={<WalletCards className="h-4 w-4" />}
                />

                <fieldset className="auth-field">
                  <legend className="auth-field-label">Account type</legend>
                  <div className="flex gap-2" role="group" aria-label="Account type">
                    {[
                      { value: "savings", label: "Savings" },
                      { value: "current", label: "Current" },
                    ].map((option) => {
                      const selected = accountKind === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          disabled={savingAccount}
                          onClick={() => setAccountKind(option.value)}
                          className={`finance-focus min-h-12 flex-1 rounded-[13px] px-3 text-sm font-semibold transition-colors ${
                            selected
                              ? "bg-primary-soft text-primary ring-1 ring-primary/30"
                              : "bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <AuthField
                  id="onboarding-opening-balance"
                  name="opening_balance"
                  label="Opening balance"
                  value={openingBalance}
                  onChange={(event) => {
                    setOpeningBalance(event.target.value);
                    clearAccountError("openingBalance");
                  }}
                  placeholder="0"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={savingAccount}
                  error={accountErrors.openingBalance}
                  helper="Optional — leave blank to start from zero."
                  inputRef={openingBalanceRef}
                />
              </div>
            )}

            <div className="auth-feedback-slot">
              {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
            </div>

            <AuthSubmitAction
              type="submit"
              loading={savingAccount}
              loadingLabel={hasAccount ? "Continuing…" : "Creating account…"}
              disabled={savingAccount}
            >
              {hasAccount ? "Continue" : "Create account"} <ArrowRight className="h-4 w-4" />
            </AuthSubmitAction>

            {!hasAccount ? (
              <Button
                type="button"
                variant="link"
                className="mt-2 w-full"
                onClick={() => moveToStep(3)}
                disabled={savingAccount}
              >
                I’ll do this later
              </Button>
            ) : null}
          </form>
        ) : null}

        {!businessFlow && step === 3 ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3 w-fit"
              onClick={() => moveToStep(2)}
              disabled={completing}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <div className="rounded-[var(--radius-card)] bg-success-soft p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-text-primary">Setup complete</h2>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Start with one accurate transaction, then review the result from your dashboard.
                  </p>
                </div>
              </div>

              <ul className="mt-4 grid gap-2 text-sm leading-6 text-text-secondary sm:grid-cols-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  Profile saved
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {hasAccount ? "Account ready" : "Account can be added later"}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  Dashboard ready
                </li>
              </ul>
            </div>

            <div className="auth-feedback-slot mt-3">
              {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
            </div>

            <Button
              type="button"
              size="lg"
              className="mt-4 w-full"
              loading={completing}
              loadingLabel="Opening dashboard…"
              onClick={completeOnboarding}
              disabled={completing}
            >
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="mt-3 text-center text-xs leading-5 text-text-tertiary">
              You can update these details later from Settings.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex items-start justify-center gap-2 text-center text-xs leading-5 text-text-tertiary">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            {businessFlow
              ? "Your company will receive its own isolated data, roles, currency, and accounting ledger."
              : "Progress is saved to this signed-in account and completes only on the final step."}
          </span>
        </div>
      </div>
    </AuthShell>
  );
}
