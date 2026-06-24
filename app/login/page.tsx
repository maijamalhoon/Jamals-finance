"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LineChart,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBaseClass =
  "h-[52px] w-full rounded-full border border-white/12 bg-white/[0.075] px-4 text-[15px] font-medium text-white outline-none transition placeholder:text-white/38 hover:border-white/18 hover:bg-white/[0.095] focus:border-blue-300/70 focus:bg-white/[0.11] focus:ring-4 focus:ring-blue-400/15";

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
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

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.1 12.7c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.8-1.1-2.8-4.3h-.3ZM14.7 5.5c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.7-3.1 1.6-.7.8-1.3 2.1-1.1 3.2 1.2.1 2.4-.6 3.1-1.5Z"
      />
    </svg>
  );
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
      className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-bold text-[#07101f] shadow-[0_18px_40px_rgba(255,255,255,0.12)] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-95"
    >
      {loading ?
        <LoaderCircle className="h-4 w-4 animate-spin" />
      : null}
      <span>{children}</span>
      {!loading ?
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      : null}
    </motion.button>
  );
}

function SocialButton({
  children,
  onClick,
  disabled,
  loading,
}: {
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
      className="flex h-[50px] w-full items-center justify-center gap-3 rounded-full border border-white/12 bg-white/[0.075] text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition hover:border-white/18 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ?
        <LoaderCircle className="h-4 w-4 animate-spin" />
      : children}
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
      <span className="mb-2 block text-xs font-semibold text-white/58">
        {label}
      </span>

      <div className="relative">
        {icon ?
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45">
            {icon}
          </span>
        : null}

        {children}
      </div>
    </label>
  );
}

function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-400/20 bg-red-500/12 px-4 py-3 text-sm font-medium leading-6 text-red-100"
    >
      {children}
    </motion.p>
  );
}

function HeroGlassCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="rounded-[28px] border border-white/12 bg-white/[0.085] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-blue-100">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="text-xs font-medium text-white/45">{subtitle}</p>
        </div>
      </div>

      {children ?
        <div className="mt-5">{children}</div>
      : null}
    </motion.div>
  );
}

function HeroPanel() {
  const points = [
    "Track income, expenses, investments and payables in one premium dashboard.",
    "Get clean financial overview with animated charts and daily insights.",
    "Secure Supabase sync keeps your personal finance data protected.",
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative hidden min-h-[680px] w-full flex-col justify-center overflow-visible pr-4 lg:flex"
    >
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-[420px] w-[420px] rounded-full bg-violet-500/18 blur-3xl" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white/72 backdrop-blur">
          <Sparkles className="h-4 w-4 text-blue-200" />
          Jamals Finance Premium Access
        </div>

        <h2 className="mt-8 max-w-[580px] text-[56px] font-semibold leading-[1.01] tracking-[-0.075em] text-white xl:text-[62px]">
          Your money, goals and growth in one calm workspace.
        </h2>

        <p className="mt-5 max-w-[470px] text-[16px] leading-7 text-white/62">
          Sign in once and manage your complete finance system with a smooth,
          modern and secure experience.
        </p>

        <div className="mt-10 grid max-w-[650px] grid-cols-2 gap-4">
          <HeroGlassCard
            icon={<WalletCards className="h-5 w-5" />}
            title="Net balance"
            subtitle="Track every account"
          >
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-[-0.05em] text-white">
                $24,850
              </p>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                +18.4%
              </span>
            </div>
          </HeroGlassCard>

          <HeroGlassCard
            icon={<LineChart className="h-5 w-5" />}
            title="Cash flow"
            subtitle="Live monthly insight"
          >
            <div className="flex h-20 items-end gap-2">
              {[38, 58, 46, 74, 56, 82, 66, 92].map((height, index) => (
                <motion.span
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{
                    duration: 0.9,
                    delay: index * 0.08,
                    repeat: Infinity,
                    repeatType: "reverse",
                    repeatDelay: 2,
                  }}
                  className="w-full rounded-full bg-white/70"
                />
              ))}
            </div>
          </HeroGlassCard>

          <div className="col-span-2">
            <HeroGlassCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Goals progress"
              subtitle="Animated from zero"
            >
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    repeatType: "reverse",
                    repeatDelay: 2,
                  }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </HeroGlassCard>
          </div>
        </div>

        <div className="mt-5 grid max-w-[650px] gap-3">
          {points.map((point, index) => (
            <motion.div
              key={point}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.12 }}
              className="flex items-start gap-3 rounded-3xl border border-white/12 bg-white/[0.075] p-4 backdrop-blur"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-white/72">{point}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}

function MobileBenefitCards() {
  return (
    <div className="grid w-full max-w-[430px] gap-3 lg:hidden">
      <div className="rounded-[28px] border border-white/12 bg-white/[0.075] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <WalletCards className="h-5 w-5 text-emerald-200" />
          <div>
            <p className="text-sm font-semibold text-white">Smart dashboard</p>
            <p className="text-xs text-white/50">
              Track your money in one clean workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/12 bg-white/[0.075] p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <LineChart className="h-5 w-5 text-blue-200" />
          <div>
            <p className="text-sm font-semibold text-white">Fast insights</p>
            <p className="text-xs text-white/50">
              Smooth charts, goals and secure sync.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

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

  async function handleEmailContinue(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = cleanEmail(email);

    if (!nextEmail) {
      setError("Email address enter karo.");
      return;
    }

    if (!emailRegex.test(nextEmail)) {
      setError("Valid email address enter karo.");
      return;
    }

    setLoadingMode("checking");

    const { data, error: rpcError } = await supabase.rpc("email_exists", {
      p_email: nextEmail,
    });

    setLoadingMode(null);

    if (rpcError) {
      setError(
        "Account check nahi ho saka. Supabase RPC email_exists check karo.",
      );
      return;
    }

    setEmail(nextEmail);

    if (data === true) {
      setStep("login");
    } else {
      setStep("signup");
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    if (!password) {
      setError("Password enter karo.");
      return;
    }

    setLoadingMode("signing");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail(email),
      password,
    });

    if (signInError) {
      setLoadingMode(null);
      setError("Email ya password wrong hai.");
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
      setError("Apna full name enter karo.");
      return;
    }

    if (
      !age ||
      Number.isNaN(numericAge) ||
      numericAge < 10 ||
      numericAge > 120
    ) {
      setError("Valid age enter karo.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password kam se kam 6 characters ka hona chahiye.");
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
        setError("Is email ka account already hai. Password se login karo.");
        return;
      }

      setError(signUpError.message || "Account create nahi ho saka.");
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setLoadingMode(null);
    setStep("check-email");
    setMessage(`Verification link ${cleanEmail(email)} par send ho gaya hai.`);
  }

  async function handleGoogleSignIn() {
    resetFeedback();
    setLoadingMode("google");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (oauthError) {
      setLoadingMode(null);
      setError(oauthError.message || "Google sign in nahi ho saka.");
    }
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    resetFeedback();

    const nextEmail = cleanEmail(email);

    if (!nextEmail || !emailRegex.test(nextEmail)) {
      setError("Valid email address enter karo.");
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
      setError(resetError.message || "Reset link send nahi ho saka.");
      return;
    }

    setStep("check-email");
    setMessage(`Password reset link ${nextEmail} par send ho gaya hai.`);
  }

  const title =
    step === "email" ? "Log in or sign up"
    : step === "login" ? "Welcome back"
    : step === "signup" ? "Create your account"
    : step === "forgot" ? "Reset password"
    : "Check your email";

  const subtitle =
    step === "email" ?
      "Continue to your personal finance dashboard with secure sync and smarter insights."
    : step === "login" ?
      "This account already exists. Enter your password to continue."
    : step === "signup" ?
      "This email is new. Add your details to finish signup."
    : step === "forgot" ? "Enter your email and we’ll send a secure reset link."
    : message || "Open your inbox and follow the secure link.";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#050914] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(59,130,246,0.28),transparent_32%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,0.24),transparent_34%),linear-gradient(135deg,#07111f_0%,#0b1326_42%,#151139_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-[1220px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_430px]">
        <HeroPanel />

        <div className="flex w-full flex-col items-center gap-4">
          <motion.section
            initial={{ opacity: 0, x: 18, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-[430px] overflow-hidden rounded-[36px] border border-white/12 bg-white/[0.085] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-7 lg:mx-0"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.14),transparent_40%)]" />

            <div className="relative z-10">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-full text-white/48 transition hover:bg-white/10 hover:text-white active:scale-95"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {step !== "email" ?
                <button
                  type="button"
                  onClick={backToEmail}
                  className="mb-4 inline-flex h-10 items-center gap-2 rounded-full px-2 text-sm font-semibold text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              : <div className="h-10" />}

              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/12 bg-white/10 shadow-[0_16px_36px_rgba(59,130,246,0.14)]">
                  <ShieldCheck className="h-6 w-6 text-blue-100" />
                </div>

                <h1 className="text-[32px] font-semibold tracking-[-0.055em] text-white">
                  {title}
                </h1>

                <p className="mx-auto mt-4 max-w-[320px] text-[15.5px] leading-7 text-white/60">
                  {subtitle}
                </p>
              </div>

              {step === "email" ?
                <form onSubmit={handleEmailContinue} className="space-y-4">
                  <SocialButton
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    loading={loadingMode === "google"}
                  >
                    <GoogleLogo />
                    <span>Continue with Google</span>
                  </SocialButton>

                  <SocialButton
                    onClick={() =>
                      setError(
                        "Apple sign in ke liye pehle Supabase Apple provider enable karna hoga.",
                      )
                    }
                    disabled={isLoading}
                  >
                    <AppleLogo />
                    <span>Continue with Apple</span>
                  </SocialButton>

                  <SocialButton
                    onClick={() =>
                      setError(
                        "Phone login abhi enable nahi hai. Email ya Google use karo.",
                      )
                    }
                    disabled={isLoading}
                  >
                    <Phone className="h-4 w-4" />
                    <span>Continue with phone</span>
                  </SocialButton>

                  <div className="flex items-center gap-5 py-3">
                    <span className="h-px flex-1 bg-white/12" />
                    <span className="text-xs font-semibold text-white/46">
                      OR
                    </span>
                    <span className="h-px flex-1 bg-white/12" />
                  </div>

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
                    <ErrorMessage>{error}</ErrorMessage>
                  : null}

                  <PrimaryButton
                    type="submit"
                    disabled={isLoading}
                    loading={loadingMode === "checking"}
                  >
                    Continue
                  </PrimaryButton>
                </form>
              : null}

              {step === "login" ?
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="rounded-2xl border border-white/12 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76">
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
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white/42 transition hover:bg-white/10 hover:text-white"
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
                    <ErrorMessage>{error}</ErrorMessage>
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
                    className="w-full rounded-full py-2 text-sm font-semibold text-white/58 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Forgot password?
                  </button>
                </form>
              : null}

              {step === "signup" ?
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="rounded-2xl border border-blue-300/18 bg-blue-400/10 px-4 py-3 text-sm font-semibold text-blue-100">
                    New account for {email}
                  </div>

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
                      className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white/42 transition hover:bg-white/10 hover:text-white"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ?
                        <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                    </button>
                  </Field>

                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/16 bg-emerald-400/10 px-4 py-3 text-xs font-semibold text-emerald-100">
                    <ShieldCheck className="h-4 w-4" />
                    Your profile will be stored securely in Supabase.
                  </div>

                  {error ?
                    <ErrorMessage>{error}</ErrorMessage>
                  : null}

                  <PrimaryButton
                    type="submit"
                    disabled={isLoading}
                    loading={loadingMode === "creating"}
                  >
                    Create account
                  </PrimaryButton>
                </form>
              : null}

              {step === "forgot" ?
                <form onSubmit={handleForgotPassword} className="space-y-4">
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
                    <ErrorMessage>{error}</ErrorMessage>
                  : null}

                  <PrimaryButton
                    type="submit"
                    disabled={isLoading}
                    loading={loadingMode === "sending"}
                  >
                    Send reset link
                  </PrimaryButton>
                </form>
              : null}

              {step === "check-email" ?
                <div className="space-y-4 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/16 bg-emerald-400/10 text-emerald-200">
                    <Mail className="h-8 w-8" />
                  </div>

                  <p className="text-sm leading-6 text-white/60">
                    Email open karo aur secure link click karo. Uske baad tum
                    dashboard par aa jaoge.
                  </p>

                  <PrimaryButton onClick={() => setStep("email")}>
                    Back to login
                  </PrimaryButton>
                </div>
              : null}

              <p className="mt-7 text-center text-[11px] leading-5 text-white/38">
                By continuing, you agree to Jamals Finance secure account
                experience.
              </p>
            </div>
          </motion.section>

          <MobileBenefitCards />
        </div>
      </div>
    </main>
  );
}
