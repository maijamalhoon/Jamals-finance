"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  normalizeLoginReason,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";
import AuthShell from "@/components/auth/AuthShell";

type Step = "login" | "signup" | "forgot" | "check-email";
type LoadingMode = "signing" | "creating" | "google" | "sending" | null;
type OAuthProvider = "google";
type AuthField = "email" | "password" | "fullName";

const authFieldErrorIds: Record<AuthField, string> = {
  email: "auth-email-error",
  password: "auth-password-error",
  fullName: "auth-full-name-error",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBaseClass = "jf-auth-input jf-auth-input-with-start";
const passwordInputClass =
  "jf-auth-input jf-auth-input-with-start jf-auth-input-with-end";

const loginReasonMessages = {
  session_expired: "Your session expired. Please log in again to continue.",
  auth_unavailable: "Authentication is temporarily unavailable. Please try again shortly.",
  callback_failed: "That sign-in link could not be completed. Please try again.",
} as const;

function onboardingDestination(next: string) {
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function getOAuthError(provider: OAuthProvider, message?: string) {
  const providerLabel = provider === "google" ? "Google" : "Google";
  const lower = message?.toLowerCase() ?? "";

  if (
    lower.includes("unsupported provider") ||
    lower.includes("provider is not enabled")
  ) {
    return `${providerLabel} sign-in is not available right now. Use email and password instead.`;
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return `Too many ${providerLabel} sign-in attempts. Please wait a moment and try again.`;
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return `${providerLabel} sign-in could not be completed. Please try again.`;
}

function getSignupError(message?: string) {
  const lower = message?.toLowerCase() ?? "";

  if (lower.includes("already") || lower.includes("registered")) {
    return "An account already exists for this email. Log in with your password.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many signup attempts. Please wait a moment and try again.";
  }

  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return "We could not create your account. Check your details and try again.";
}

function getForgotPasswordError(message?: string) {
  const lower = message?.toLowerCase() ?? "";

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset requests. Please wait a moment and try again.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return "Enter a valid email address.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return "We could not send the reset link. Please try again.";
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z"
      />
    </svg>
  );
}

function ButtonSpinner() {
  return <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />;
}

function PrimaryButton({
  children,
  disabled,
  loading,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="jf-auth-action jf-auth-primary group"
    >
      {loading ?
        <ButtonSpinner />
      : null}
      <span>{children}</span>
      {!loading ?
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      : null}
    </button>
  );
}

function SocialButton({
  icon,
  children,
  onClick,
  disabled,
  loading,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className="jf-auth-social"
    >
      <span className="grid h-5 w-5 place-items-center">
        {loading ?
          <ButtonSpinner />
        : icon}
      </span>
      <span>{children}</span>
    </button>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="jf-auth-label">{label}</span>

      <div className="jf-auth-input-glow relative">
        {icon ?
          <span className="jf-auth-field-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--jf-auth-subtle)]">
            {icon}
          </span>
        : null}

        {children}
      </div>
    </label>
  );
}

function Feedback({
  tone,
  children,
  id,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  id?: string;
}) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : undefined}
      aria-live={tone === "error" ? undefined : "polite"}
      data-tone={tone}
      className="jf-auth-feedback"
    >
      {children}
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<AuthField | null>(null);
  const [message, setMessage] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSafeNext(sanitizeInternalRedirect(params.get("next")));

    if (params.get("mode") === "forgot") setStep("forgot");

    const reason = normalizeLoginReason(params.get("reason"));
    if (reason) setMessage(loginReasonMessages[reason]);
  }, []);

  const isLoading = Boolean(loadingMode);
  const isAuthEntryStep = step === "login" || step === "signup";
  const googleButtonLabel =
    loadingMode === "google" ? "Opening Google..."
    : step === "signup" ? "Sign up with Google"
    : "Continue with Google";

  function resetFeedback() {
    setError("");
    setErrorField(null);
    setMessage("");
  }

  function setFieldError(field: AuthField, nextError: string) {
    setError(nextError);
    setErrorField(field);
  }

  function setFormError(nextError: string) {
    setError(nextError);
    setErrorField(null);
  }

  function clearFieldError(field: AuthField) {
    if (errorField !== field) return;

    setError("");
    setErrorField(null);
  }

  function switchStep(nextStep: Step) {
    resetFeedback();
    setPassword("");
    setShowPassword(false);
    setStep(nextStep);
  }

  function validateEmailAddress() {
    const nextEmail = cleanEmail(email);

    if (!nextEmail) {
      setFieldError("email", "Enter your email address.");
      return null;
    }

    if (!emailRegex.test(nextEmail)) {
      setFieldError("email", "Enter a valid email address.");
      return null;
    }

    setEmail(nextEmail);
    return nextEmail;
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = validateEmailAddress();

    if (!nextEmail) return;

    if (!password) {
      setFieldError("password", "Enter your password.");
      return;
    }

    setLoadingMode("signing");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password,
    });

    if (signInError) {
      setLoadingMode(null);
      const lower = signInError.message.toLowerCase();
      const temporarilyUnavailable =
        (signInError.status ?? 0) >= 500 ||
        lower.includes("network") ||
        lower.includes("fetch") ||
        lower.includes("timeout");
      setFormError(
        temporarilyUnavailable
          ? "Authentication is temporarily unavailable. Please try again shortly."
          : "The email or password is incorrect.",
      );
      return;
    }

    router.replace(safeNext);
    router.refresh();
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = validateEmailAddress();

    if (!nextEmail) return;

    if (!fullName.trim()) {
      setFieldError("fullName", "Enter your full name.");
      return;
    }

    if (!password || password.length < 6) {
      setFieldError("password", "Password must be at least 6 characters.");
      return;
    }

    setLoadingMode("creating");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: nextEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
      },
    });

    if (signUpError) {
      setLoadingMode(null);

      if (
        signUpError.message.toLowerCase().includes("already") ||
        signUpError.message.toLowerCase().includes("registered")
      ) {
        setStep("login");
        setFormError(getSignupError(signUpError.message));
        return;
      }

      setFormError(getSignupError(signUpError.message));
      return;
    }

    if (data.session) {
      router.replace(onboardingDestination(safeNext));
      router.refresh();
      return;
    }

    setLoadingMode(null);
    setStep("check-email");
    setMessage(`A verification link has been sent to ${nextEmail}.`);
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    resetFeedback();
    setLoadingMode(provider);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingDestination(safeNext))}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (oauthError) {
      setLoadingMode(null);
      setFormError(getOAuthError(provider, oauthError.message));
    }
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = validateEmailAddress();

    if (!nextEmail) return;

    setLoadingMode("sending");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      nextEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoadingMode(null);

    if (resetError) {
      setFormError(getForgotPasswordError(resetError.message));
      return;
    }

    setStep("check-email");
    setMessage(`A password reset link has been sent to ${nextEmail}.`);
  }

  const title =
    step === "login" ? "Welcome back"
    : step === "signup" ? "Create your account"
    : step === "forgot" ? "Reset password"
    : "Check your email";

  const subtitle =
    step === "login" ? "Log in to continue to your personal finance dashboard."
    : step === "signup" ?
      "Create a secure Jamal's Finance account in a few seconds."
    : step === "forgot" ?
      "Enter your email and we will send a secure reset link."
    : message || "Open your inbox and follow the secure link.";

  return (
    <AuthShell
      eyebrow={
        step === "login" ? "Account access"
        : step === "signup" ? "New workspace"
        : step === "forgot" ? "Password recovery"
        : "Email confirmation"
      }
      title={title}
      description={subtitle}
      icon={step === "check-email" ? Mail : ShieldCheck}
    >
      {isAuthEntryStep ? (
        <div className="jf-auth-tab-list mb-4" role="group" aria-label="Authentication mode">
          <button
            type="button"
            onClick={() => switchStep("login")}
            disabled={isLoading}
            aria-pressed={step === "login"}
            data-active={step === "login"}
            className="jf-auth-tab h-11"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchStep("signup")}
            disabled={isLoading}
            aria-pressed={step === "signup"}
            data-active={step === "signup"}
            className="jf-auth-tab h-11"
          >
            Sign up
          </button>
        </div>
      ) : null}

      {isAuthEntryStep ? (
        <div className="jf-auth-social-block mb-4 space-y-3">
          <SocialButton
            icon={<GoogleLogo />}
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading}
            loading={loadingMode === "google"}
          >
            {googleButtonLabel}
          </SocialButton>

          <div className="jf-auth-divider" aria-hidden="true">
            <span />
            <strong>or use email</strong>
            <span />
          </div>
        </div>
      ) : null}

      {step === "login" ? (
        <form onSubmit={handleLogin} noValidate className="jf-auth-form space-y-4">
                <Field
                  label="Email address"
                  icon={<Mail className="h-4 w-4" />}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    aria-invalid={errorField === "email"}
                    aria-describedby={
                      errorField === "email" ? authFieldErrorIds.email : undefined
                    }
                    className={`${inputBaseClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-invalid={errorField === "password"}
                    aria-describedby={
                      errorField === "password" ? authFieldErrorIds.password : undefined
                    }
                    className={`${passwordInputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="jf-auth-password-toggle absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl text-[var(--jf-auth-subtle)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ?
                      <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                {error ?
                  <Feedback
                    id={errorField ? authFieldErrorIds[errorField] : "auth-error"}
                    tone="error"
                  >
                    {error}
                  </Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "signing"}
                >
                  {loadingMode === "signing" ? "Logging in..." : "Log in"}
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => switchStep("forgot")}
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-[var(--jf-auth-muted)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Forgot password?
                </button>
        </form>
      ) : null}

      {step === "signup" ? (
        <form onSubmit={handleSignup} noValidate className="jf-auth-form space-y-4">
                <Field
                  label="Full name"
                  icon={<UserRound className="h-4 w-4" />}
                >
                  <input
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      clearFieldError("fullName");
                    }}
                    placeholder="Enter your name"
                    autoComplete="name"
                    disabled={isLoading}
                    aria-invalid={errorField === "fullName"}
                    aria-describedby={
                      errorField === "fullName" ? authFieldErrorIds.fullName : undefined
                    }
                    className={`${inputBaseClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Email address"
                  icon={<Mail className="h-4 w-4" />}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    aria-invalid={errorField === "email"}
                    aria-describedby={
                      errorField === "email" ? authFieldErrorIds.email : undefined
                    }
                    className={`${inputBaseClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearFieldError("password");
                    }}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={errorField === "password"}
                    aria-describedby={
                      errorField === "password"
                        ? `password-help ${authFieldErrorIds.password}`
                        : "password-help"
                    }
                    className={`${passwordInputClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="jf-auth-password-toggle absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl text-[var(--jf-auth-subtle)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ?
                      <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                <div id="password-help" className="jf-auth-security-note flex items-start gap-2 rounded-[var(--radius-control)] border border-success/20 bg-success/10 px-4 py-3 text-xs font-medium leading-5 text-success">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Use at least 6 characters. Profile details are completed during onboarding.
                </div>

                {error ?
                  <Feedback
                    id={errorField ? authFieldErrorIds[errorField] : "auth-error"}
                    tone="error"
                  >
                    {error}
                  </Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "creating"}
                >
                  {loadingMode === "creating" ? "Creating account..." : "Create account"}
                </PrimaryButton>
        </form>
      ) : null}

      {step === "forgot" ? (
        <form onSubmit={handleForgotPassword} noValidate className="space-y-4">
                <button
                  type="button"
                  onClick={() => switchStep("login")}
                  disabled={isLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl px-2 text-sm font-semibold text-[var(--jf-auth-muted)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </button>

                <Field
                  label="Email address"
                  icon={<Mail className="h-4 w-4" />}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError("email");
                    }}
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    aria-invalid={errorField === "email"}
                    aria-describedby={
                      errorField === "email" ? authFieldErrorIds.email : undefined
                    }
                    className={`${inputBaseClass} disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                {error ?
                  <Feedback
                    id={errorField ? authFieldErrorIds[errorField] : "auth-error"}
                    tone="error"
                  >
                    {error}
                  </Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "sending"}
                >
                  {loadingMode === "sending" ? "Sending reset link..." : "Send reset link"}
                </PrimaryButton>
        </form>
      ) : null}

      {step === "check-email" ? (
        <div className="space-y-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[var(--radius-card)] border border-success/25 bg-success/10 text-success">
                  <Mail className="h-8 w-8" />
                </div>

                {message ?
                  <Feedback tone="success">{message}</Feedback>
                : null}

                <p className="text-sm leading-6 text-[var(--jf-auth-muted)]">
                  Open your email and follow the secure link. You will be
                  redirected back after verification.
                </p>

                <PrimaryButton onClick={() => switchStep("login")}>
                  Back to login
                </PrimaryButton>
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-text-tertiary">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
        <span>Protected by the existing Supabase authentication flow.</span>
      </div>
    </AuthShell>
  );
}
