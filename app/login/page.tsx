"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "login" | "signup" | "forgot" | "check-email";

type LoadingMode =
  | "checking"
  | "signing"
  | "creating"
  | "google"
  | "sending"
  | null;

type OAuthProvider = "google";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBaseClass =
  "h-12 w-full rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.075)] px-4 text-[15px] font-medium text-[rgba(248,251,255,0.96)] outline-none transition placeholder:text-[rgba(248,251,255,0.36)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.1)] focus:border-[#8ec5ff] focus:bg-[rgba(255,255,255,0.11)] focus:ring-4 focus:ring-[rgba(96,165,250,0.18)]";

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
    return `${providerLabel} is not enabled in Supabase. Open Authentication > Providers, enable ${providerLabel}, and add your callback URL to the redirect allow list.`;
  }

  return message || `${providerLabel} sign-in could not be completed.`;
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
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f8fbff] px-5 text-[15px] font-bold text-[#07101f] shadow-[0_18px_44px_rgba(216,235,255,0.16)] transition hover:bg-[#eaf5ff] disabled:cursor-not-allowed disabled:opacity-80"
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
      className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-[rgba(255,255,255,0.13)] bg-[rgba(255,255,255,0.075)] text-[15px] font-semibold text-[rgba(248,251,255,0.94)] shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
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
      <span className="mb-2 block text-xs font-semibold text-[rgba(248,251,255,0.58)]">
        {label}
      </span>

      <div className="relative">
        {icon ?
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(248,251,255,0.46)]">
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
  const toneClass =
    tone === "error" ?
      "border-[rgba(248,113,113,0.26)] bg-[rgba(239,68,68,0.14)] text-[#fecaca]"
    : tone === "success" ?
      "border-[rgba(52,211,153,0.24)] bg-[rgba(16,185,129,0.12)] text-[#bbf7d0]"
    : "border-[rgba(125,211,252,0.22)] bg-[rgba(14,165,233,0.12)] text-[#bae6fd]";

  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-4 py-3 text-sm font-medium leading-6 ${toneClass}`}
    >
      {children}
    </motion.p>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.075)] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.09)] text-[#dbeafe]">
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
          Live
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-[rgba(248,251,255,0.56)]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-[#f8fbff]">{value}</p>
    </div>
  );
}

function HeroPanel() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative hidden min-h-[660px] w-full flex-col justify-center overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.25)] lg:flex xl:p-10"
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-3.5 py-2 text-sm font-semibold text-[rgba(248,251,255,0.72)]">
          <Sparkles className="h-4 w-4 text-[#fef3c7]" />
          Jamals Finance
        </div>

        <h2 className="mt-8 max-w-[620px] text-[48px] font-semibold leading-[1.05] text-[#f8fbff] xl:text-[58px]">
          Secure access for your complete money workspace.
        </h2>

        <p className="mt-5 max-w-[510px] text-[16px] leading-7 text-[rgba(248,251,255,0.64)]">
          Track accounts, cash flow, goals and payables with a clean dashboard
          that feels fast on every screen.
        </p>

        <div className="mt-10 grid max-w-[680px] grid-cols-2 gap-4">
          <MiniStat
            icon={<WalletCards className="h-5 w-5" />}
            label="Net balance"
            value="$24,850"
            tone="bg-[rgba(34,197,94,0.14)] text-[#bbf7d0]"
          />

          <MiniStat
            icon={<TrendingUp className="h-5 w-5" />}
            label="Monthly growth"
            value="+18.4%"
            tone="bg-[rgba(251,191,36,0.15)] text-[#fde68a]"
          />

          <div className="col-span-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.075)] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.09)] text-[#bfdbfe]">
                  <LineChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#f8fbff]">Cash flow</p>
                  <p className="text-xs font-medium text-[rgba(248,251,255,0.48)]">
                    Monthly rhythm
                  </p>
                </div>
              </div>
              <BadgeCheck className="h-5 w-5 text-[#86efac]" />
            </div>

            <div className="flex h-20 items-end gap-2">
              {[38, 58, 46, 74, 56, 82, 66, 92].map((height, index) => (
                <motion.span
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{
                    duration: 0.9,
                    delay: index * 0.07,
                    repeat: Infinity,
                    repeatType: "reverse",
                    repeatDelay: 2,
                  }}
                  className="w-full rounded-full bg-[linear-gradient(180deg,#f8fbff,#93c5fd)]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function MobileHighlights() {
  return (
    <div className="grid w-full max-w-[460px] grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
      {[
        {
          icon: <WalletCards className="h-5 w-5 text-[#86efac]" />,
          title: "Smart dashboard",
          copy: "Accounts, goals and cash flow together.",
        },
        {
          icon: <LineChart className="h-5 w-5 text-[#93c5fd]" />,
          title: "Fast insights",
          copy: "Smooth charts with secure sync.",
        },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.07)] p-4"
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <div>
              <p className="text-sm font-semibold text-[#f8fbff]">
                {item.title}
              </p>
              <p className="text-xs text-[rgba(248,251,255,0.54)]">
                {item.copy}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const enableGoogleAuth =
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

  const [step, setStep] = useState<Step>("email");
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

  function backToEmail() {
    resetFeedback();
    setPassword("");
    setStep("email");
  }

  function handleEmailContinue(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = cleanEmail(email);

    if (!nextEmail) {
      setError("Enter your email address.");
      return;
    }

    if (!emailRegex.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setEmail(nextEmail);
    setPassword("");
    setShowPassword(false);
    setStep("login");
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoadingMode("signing");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail(email),
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

    const numericAge = Number(age);

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
      email: cleanEmail(email),
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

      if (signUpError.message.toLowerCase().includes("already")) {
        setStep("login");
        setError(
          "An account already exists for this email. Log in with your password.",
        );
        return;
      }

      setError(signUpError.message || "We could not create your account.");
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setLoadingMode(null);
    setStep("check-email");
    setMessage(`A verification link has been sent to ${cleanEmail(email)}.`);
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

    const nextEmail = cleanEmail(email);

    if (!nextEmail || !emailRegex.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoadingMode("sending");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      nextEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoadingMode(null);

    if (resetError) {
      setError(resetError.message || "We could not send the reset link.");
      return;
    }

    setStep("check-email");
    setMessage(`A password reset link has been sent to ${nextEmail}.`);
  }

  const title =
    step === "email" ? "Log in or sign up"
    : step === "login" ? "Welcome back"
    : step === "signup" ? "Create your account"
    : step === "forgot" ? "Reset password"
    : "Check your email";

  const subtitle =
    step === "email" ? "Secure access for your personal finance dashboard."
    : step === "login" ?
      "Enter your password to continue, or create a new account."
    : step === "signup" ?
      "Add your details to create your Jamal's Finance account."
    : step === "forgot" ?
      "Enter your email and we will send a secure reset link."
    : message || "Open your inbox and follow the secure link.";

  return (
    <main className="jf-auth-page relative min-h-dvh overflow-x-hidden bg-[linear-gradient(135deg,#07111a_0%,#0c1724_48%,#121523_100%)] px-4 py-5 text-[#f8fbff] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-[1240px] items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(390px,450px)] lg:gap-8">
        <HeroPanel />

        <div className="flex w-full flex-col items-center gap-4">
          <motion.section
            initial={{ opacity: 0, x: 18, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.085)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6 lg:mx-0"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />

            <div className="relative z-10">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-lg text-[rgba(248,251,255,0.48)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff] active:scale-95"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {step !== "email" ?
                <button
                  type="button"
                  onClick={backToEmail}
                  className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[rgba(248,251,255,0.58)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              : <div className="h-10" />}

              <div className="mb-7 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-[rgba(255,255,255,0.13)] bg-[rgba(255,255,255,0.09)] shadow-[0_16px_36px_rgba(59,130,246,0.16)]">
                  <ShieldCheck className="h-6 w-6 text-[#bfdbfe]" />
                </div>

                <h1 className="text-[30px] font-semibold leading-tight text-[#f8fbff] sm:text-[34px]">
                  {title}
                </h1>

                <p className="mx-auto mt-3 max-w-[330px] text-[15px] leading-7 text-[rgba(248,251,255,0.62)]">
                  {subtitle}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {step === "email" ?
                  <motion.form
                    key="email"
                    onSubmit={handleEmailContinue}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {enableGoogleAuth ?
                      <>
                        <SocialButton
                          icon={<GoogleLogo />}
                          onClick={() => handleOAuthSignIn("google")}
                          disabled={isLoading}
                          loading={loadingMode === "google"}
                        >
                          Continue with Google
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

                    {error ?
                      <Feedback tone="error">{error}</Feedback>
                    : null}

                    <PrimaryButton
                      type="submit"
                      disabled={isLoading}
                      loading={loadingMode === "checking"}
                    >
                      Continue with email
                    </PrimaryButton>
                  </motion.form>
                : null}

                {step === "login" ?
                  <motion.form
                    key="login"
                    onSubmit={handleLogin}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <div className="rounded-lg border border-[rgba(255,255,255,0.13)] bg-[rgba(255,255,255,0.075)] px-4 py-3 text-sm font-semibold text-[rgba(248,251,255,0.78)]">
                      {email}
                    </div>

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
                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[rgba(248,251,255,0.44)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff]"
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
                      onClick={() => {
                        resetFeedback();
                        setStep("forgot");
                      }}
                      disabled={isLoading}
                      className="w-full rounded-lg py-2 text-sm font-semibold text-[rgba(248,251,255,0.6)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Forgot password?
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback();
                        setPassword("");
                        setShowPassword(false);
                        setStep("signup");
                      }}
                      disabled={isLoading}
                      className="w-full rounded-lg py-2 text-sm font-semibold text-[#bfdbfe] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Create a new account
                    </button>
                  </motion.form>
                : null}

                {step === "signup" ?
                  <motion.form
                    key="signup"
                    onSubmit={handleSignup}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <Feedback tone="info">
                      Creating account for {email}
                    </Feedback>

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
                          setAge(
                            event.target.value.replace(/\D/g, "").slice(0, 3),
                          )
                        }
                        placeholder="Enter your age"
                        inputMode="numeric"
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
                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[rgba(248,251,255,0.44)] transition hover:bg-[rgba(255,255,255,0.1)] hover:text-[#f8fbff]"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ?
                          <EyeOff className="h-4 w-4" />
                        : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>

                    <div className="flex items-center gap-2 rounded-lg border border-[rgba(52,211,153,0.18)] bg-[rgba(16,185,129,0.1)] px-4 py-3 text-xs font-semibold text-[#bbf7d0]">
                      <ShieldCheck className="h-4 w-4" />
                      Your profile will be stored securely in Supabase.
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
                    className="space-y-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg border border-[rgba(52,211,153,0.22)] bg-[rgba(16,185,129,0.12)] text-[#bbf7d0]">
                      <Mail className="h-8 w-8" />
                    </div>

                    <p className="text-sm leading-6 text-[rgba(248,251,255,0.62)]">
                      Open your email and follow the secure link. You will be
                      redirected back to your dashboard after verification.
                    </p>

                    <PrimaryButton onClick={() => setStep("email")}>
                      Back to login
                    </PrimaryButton>
                  </motion.div>
                : null}
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[rgba(248,251,255,0.42)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
                <span>Protected by Supabase Auth and secure sessions.</span>
              </div>
            </div>
          </motion.section>

          <MobileHighlights />
        </div>
      </div>
    </main>
  );
}
