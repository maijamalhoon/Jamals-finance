"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Step = "auth" | "otp" | "forgot";
type LoadingMode = "syncing" | "creating" | "verifying" | "sending" | null;

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<Step>("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<LoadingMode>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignIn() {
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    setLoading(true);
    setLoadingMode("syncing");
    setError("");

    const { error: e } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (e) {
      setLoading(false);
      setLoadingMode(null);
      setError("Wrong email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleSignUp() {
    if (!name || !email || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setLoadingMode("creating");
    setError("");

    const { error: e } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone },
      },
    });

    setLoading(false);
    setLoadingMode(null);
    if (e) {
      setError(e.message);
    } else {
      setStep("otp");
      setMessage(`We sent a 6-digit code to ${email}. Check your inbox.`);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setLoadingMode("syncing");
    setError("");

    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (e) {
      setLoading(false);
      setLoadingMode(null);
      setError(e.message);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    setLoadingMode("sending");
    setError("");

    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    setLoadingMode(null);

    if (e) {
      setError(e.message);
    } else {
      setMessage(`Password reset link sent to ${email}.`);
    }
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setLoadingMode("verifying");
    setError("");

    const { error: e } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (e) {
      setLoading(false);
      setLoadingMode(null);
      setError("Invalid or expired code. Try again.");
    } else {
      router.push("/dashboard");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "forgot") return handleForgotPassword();
    if (step === "otp") return handleVerifyOtp();
    if (isSignUp) return handleSignUp();
    return handleSignIn();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d1118] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[8%] top-[-10%] h-80 w-80 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14%] right-[6%] h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-[52px] w-[52px] place-items-center rounded-[28px] bg-cyan-300 text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.22)]">
              <BarChart3 size={23} />
            </div>
            <div>
              <span className="block text-2xl font-bold text-white">
                Jamal's Finance
              </span>
              <span className="block text-sm text-slate-400">
                One UI inspired personal finance OS
              </span>
            </div>
          </div>

          <div className="finance-glass-panel max-w-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                  Live workspace preview
                </p>
                <h1 className="mt-3 text-4xl font-bold leading-tight tracking-normal text-white">
                  Your money dashboard, polished for daily control.
                </h1>
              </div>
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[24px] bg-white/[0.07] text-cyan-200 ring-1 ring-white/[0.08]">
                <Sparkles size={20} />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Balance", "PKR 1.2M", "Liquid view"],
                ["Savings", "34%", "Monthly pace"],
                ["Signals", "8", "Smart checks"],
              ].map(([label, value, detail]) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/[0.08] bg-white/[0.055] p-4"
                >
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-bold text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-300/12 bg-emerald-300/[0.06] p-4">
                <ShieldCheck size={18} className="text-emerald-200" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Secure session
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Supabase auth with email verification for account creation.
                </p>
              </div>
              <div className="rounded-[24px] border border-sky-300/12 bg-sky-300/[0.06] p-4">
                <Landmark size={18} className="text-sky-200" />
                <p className="mt-3 text-sm font-semibold text-white">
                  Full finance stack
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Accounts, transactions, goals, reports, and AI insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full">
        <div className="mx-auto w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.22)]">
            <BarChart3 size={21} />
          </div>
          <div>
            <span className="block text-white font-bold text-xl">
              Jamal's Finance
            </span>
            <span className="block text-slate-500 text-xs">
              Personal finance workspace
            </span>
          </div>
        </div>

        <div className="finance-panel p-6 sm:p-8">
          {step === "otp" ?
            <>
              <h2 className="text-white font-semibold text-lg mb-1">
                Check your email
              </h2>
              <p className="text-slate-400 text-xs mb-5">{message}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-slate-300 text-xs block mb-1.5">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                    className="field-input text-center text-2xl font-bold tracking-widest"
                  />
                </div>

                {error && (
                  <p className="text-red-300 text-xs bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-action w-full py-4"
                >
                  {loading ? "Verifying..." : "Verify & Create Account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("auth");
                    setOtp("");
                    setError("");
                  }}
                  className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors"
                >
                  Back to sign up
                </button>
              </form>
            </>
          : step === "forgot" ?
            <>
              <h2 className="text-white font-semibold text-lg mb-1">
                Reset password
              </h2>
              <p className="text-slate-400 text-xs mb-5">
                Enter your email and we will send a secure reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field-input"
                  />
                </div>

                {message && (
                  <p className="text-emerald-300 text-xs bg-emerald-500/10 p-3 rounded-lg">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="text-red-300 text-xs bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-action w-full py-4"
                >
                  {loading ? "Sending reset link..." : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("auth");
                    setError("");
                    setMessage("");
                  }}
                  className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            </>
          : <>
              <h2 className="text-white font-semibold text-lg mb-1">
                {isSignUp ? "Create account" : "Welcome back"}
              </h2>
              <p className="text-slate-400 text-xs mb-5">
                {isSignUp ?
                  "Fill in your details to get started"
                : "Sign in to your dashboard"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                {isSignUp && (
                  <div>
                    <label className="field-label">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jamal Malhoon"
                      className="field-input"
                    />
                  </div>
                )}

                {isSignUp && (
                  <div>
                    <label className="field-label">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 0000000"
                      className="field-input"
                    />
                  </div>
                )}

                <div>
                  <label className="field-label">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="field-input pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ?
                        <EyeOff size={15} />
                      : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-300 text-xs bg-red-500/10 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-action mt-1 w-full py-4"
                >
                  {loading ?
                    isSignUp ?
                      "Creating account..."
                    : "Signing in..."
                  : isSignUp ?
                    "Create Account"
                  : "Sign In"}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-600">
                  or
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="finance-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.055] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09] disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                Continue with Google
              </button>

              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("forgot");
                    setError("");
                    setMessage("");
                  }}
                  className="mt-4 w-full text-center text-xs text-cyan-200 transition-colors hover:text-cyan-100"
                >
                  Forgot password?
                </button>
              )}

              <p className="text-center text-slate-500 text-xs mt-4">
                {isSignUp ?
                  "Already have an account?"
                : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp((p) => !p);
                    setError("");
                    setMessage("");
                  }}
                  className="text-cyan-200 transition-colors hover:text-cyan-100"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </>
          }
        </div>
      </div>
      </section>
      </div>
      <AnimatePresence>
        {loadingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 grid place-items-center bg-[#121318]/72 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="finance-glass-panel w-full max-w-sm p-7 text-center"
            >
              {loadingMode === "creating" ? (
                <>
                  <div className="mx-auto mb-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-cyan-300"
                      initial={{ width: "18%" }}
                      animate={{ width: ["18%", "58%", "86%"] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                  <motion.p
                    animate={{ opacity: [0.72, 1, 0.72] }}
                    transition={{ duration: 1.35, repeat: Infinity }}
                    className="text-lg font-bold text-white"
                  >
                    Creating your account...
                  </motion.p>
                  <p className="mt-2 text-sm text-slate-400">
                    Setting up your financial command center...
                  </p>
                </>
              ) : (
                <>
                  <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-cyan-200" />
                  <motion.p
                    animate={{ opacity: [0.72, 1, 0.72] }}
                    transition={{ duration: 1.35, repeat: Infinity }}
                    className="mt-5 text-lg font-bold text-white"
                  >
                    Loading your data...
                  </motion.p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
