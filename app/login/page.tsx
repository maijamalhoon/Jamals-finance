"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Step = "login" | "signup" | "forgot" | "check-email";
type LoadingMode = "signing" | "creating" | "google" | "sending" | null;
type OAuthProvider = "google";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBaseClass = "jf-auth-input";

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
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      whileHover={{ y: disabled || loading ? 0 : -1 }}
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
    </motion.button>
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
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      whileHover={{ y: disabled || loading ? 0 : -1 }}
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
    </motion.button>
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
      <span className="jf-auth-label">
        {label}
      </span>

      <div className="jf-auth-input-glow relative">
        {icon ?
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--jf-auth-subtle)]">
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
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === "error" ? "alert" : undefined}
      aria-live={tone === "error" ? undefined : "polite"}
      data-tone={tone}
      className="jf-auth-feedback"
    >
      {children}
    </motion.p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isGoogleAuthEnabled =
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isLoading = Boolean(loadingMode);

  function resetFeedback() {
    setError("");
    setMessage("");
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
      setError("Enter your email address.");
      return null;
    }

    if (!emailRegex.test(nextEmail)) {
      setError("Enter a valid email address.");
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
      setError("Enter your password.");
      return;
    }

    setLoadingMode("signing");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: nextEmail,
      password,
    });

    if (signInError) {
      setLoadingMode(null);
      setError("The email or password is incorrect.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = validateEmailAddress();
    const numericAge = Number(age);

    if (!nextEmail) return;

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (
      !age ||
      Number.isNaN(numericAge) ||
      numericAge < 10 ||
      numericAge > 120
    ) {
      setError("Enter a valid age.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoadingMode("creating");

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: nextEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          age: String(numericAge),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpError) {
      setLoadingMode(null);

      if (
        signUpError.message.toLowerCase().includes("already") ||
        signUpError.message.toLowerCase().includes("registered")
      ) {
        setStep("login");
        setError(getSignupError(signUpError.message));
        return;
      }

      setError(getSignupError(signUpError.message));
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
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
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (oauthError) {
      setLoadingMode(null);
      setError(getOAuthError(provider, oauthError.message));
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
      setError(getForgotPasswordError(resetError.message));
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
    <main className="jf-auth-page jf-login-polish relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 text-[var(--jf-auth-text)] sm:px-6 lg:px-8">
      <div className="jf-auth-grid pointer-events-none absolute inset-0" />
      <div className="jf-auth-accent-line pointer-events-none absolute inset-x-0 top-0 h-1" />

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="jf-auth-card relative w-full max-w-[520px] overflow-hidden p-5 sm:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />

        <div className="relative z-10">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-2xl text-[var(--jf-auth-subtle)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)] active:scale-95"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-2xl border border-[var(--jf-auth-border)] bg-[var(--jf-auth-panel)] px-3.5 py-2 text-sm font-semibold text-[var(--jf-auth-muted)]">
              <Sparkles className="h-4 w-4 text-[#fef3c7]" />
              Jamals Finance
            </div>

            <div className="jf-auth-icon mx-auto mb-4">
              <ShieldCheck className="h-6 w-6 text-[#bfdbfe]" />
            </div>

            <h1 className="text-[30px] font-semibold leading-tight text-[var(--jf-auth-text)] sm:text-[36px]">
              {title}
            </h1>

            <p className="mx-auto mt-3 max-w-[350px] text-[15px] leading-7 text-[var(--jf-auth-muted)]">
              {subtitle}
            </p>
          </div>

          {step === "login" || step === "signup" ?
            <div className="jf-auth-tab-list mb-5">
              <button
                type="button"
                onClick={() => switchStep("login")}
                disabled={isLoading}
                data-active={step === "login"}
                className="jf-auth-tab h-11"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchStep("signup")}
                disabled={isLoading}
                data-active={step === "signup"}
                className="jf-auth-tab h-11"
              >
                Sign up
              </button>
            </div>
          : null}

          <AnimatePresence mode="wait">
            {step === "login" ?
              <motion.form
                key="login"
                onSubmit={handleLogin}
                noValidate
                className="space-y-4"
                initial={{ opacity: 0.96, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {isGoogleAuthEnabled ?
                  <>
                    <SocialButton
                      icon={<GoogleLogo />}
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={isLoading}
                      loading={loadingMode === "google"}
                    >
                      {loadingMode === "google" ?
                        "Opening Google..."
                      : "Continue with Google"}
                    </SocialButton>

                    <div className="flex items-center gap-5 py-2">
                      <span className="h-px flex-1 bg-[rgba(255,255,255,0.13)]" />
                      <span className="text-xs font-semibold text-[rgba(255,255,255,0.46)]">
                        OR
                      </span>
                      <span className="h-px flex-1 bg-[rgba(255,255,255,0.13)]" />
                    </div>
                  </>
                : null}

                <Field
                  label="Email address"
                  icon={<Mail className="h-4 w-4" />}
                >
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 pr-12 disabled:cursor-not-allowed disabled:opacity-70`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl text-[var(--jf-auth-subtle)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)]"
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
                  <Feedback tone="error">{error}</Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "signing"}
                >
                  Log in
                </PrimaryButton>

                <button
                  type="button"
                  onClick={() => switchStep("forgot")}
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold text-[var(--jf-auth-muted)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Forgot password?
                </button>
              </motion.form>
            : null}

            {step === "signup" ?
              <motion.form
                key="signup"
                onSubmit={handleSignup}
                noValidate
                className="space-y-4"
                initial={{ opacity: 0.96, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {isGoogleAuthEnabled ?
                  <>
                    <SocialButton
                      icon={<GoogleLogo />}
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={isLoading}
                      loading={loadingMode === "google"}
                    >
                      {loadingMode === "google" ?
                        "Opening Google..."
                      : "Sign up with Google"}
                    </SocialButton>

                    <div className="flex items-center gap-5 py-2">
                      <span className="h-px flex-1 bg-[rgba(255,255,255,0.13)]" />
                      <span className="text-xs font-semibold text-[rgba(255,255,255,0.46)]">
                        OR
                      </span>
                      <span className="h-px flex-1 bg-[rgba(255,255,255,0.13)]" />
                    </div>
                  </>
                : null}

                <Field
                  label="Full name"
                  icon={<UserRound className="h-4 w-4" />}
                >
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field label="Age" icon={<Sparkles className="h-4 w-4" />}>
                  <input
                    value={age}
                    onChange={(event) =>
                      setAge(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="Enter your age"
                    inputMode="numeric"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Email address"
                  icon={<Mail className="h-4 w-4" />}
                >
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                <Field
                  label="Password"
                  icon={<LockKeyhole className="h-4 w-4" />}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 pr-12 disabled:cursor-not-allowed disabled:opacity-70`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl text-[var(--jf-auth-subtle)] transition hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ?
                      <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                  </button>
                </Field>

                <div className="flex items-center gap-2 rounded-2xl border border-[rgba(52,211,153,0.18)] bg-[rgba(16,185,129,0.1)] px-4 py-3 text-xs font-semibold text-[#bbf7d0]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Your profile will be stored securely with Supabase Auth.
                </div>

                {error ?
                  <Feedback tone="error">{error}</Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "creating"}
                >
                  Create account
                </PrimaryButton>
              </motion.form>
            : null}

            {step === "forgot" ?
              <motion.form
                key="forgot"
                onSubmit={handleForgotPassword}
                noValidate
                className="space-y-4"
                initial={{ opacity: 0.96, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <button
                  type="button"
                  onClick={() => switchStep("login")}
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
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    inputMode="email"
                    disabled={isLoading}
                    className={`${inputBaseClass} pl-11 disabled:cursor-not-allowed disabled:opacity-70`}
                  />
                </Field>

                {error ?
                  <Feedback tone="error">{error}</Feedback>
                : null}

                <PrimaryButton
                  type="submit"
                  disabled={isLoading}
                  loading={loadingMode === "sending"}
                >
                  Send reset link
                </PrimaryButton>
              </motion.form>
            : null}

            {step === "check-email" ?
              <motion.div
                key="check-email"
                className="space-y-4 text-center"
                initial={{ opacity: 0.96, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[rgba(52,211,153,0.22)] bg-[rgba(16,185,129,0.12)] text-[#bbf7d0]">
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
              </motion.div>
            : null}
          </AnimatePresence>

          <div className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--jf-auth-subtle)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
            <span>Protected by Supabase Auth and secure sessions.</span>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
