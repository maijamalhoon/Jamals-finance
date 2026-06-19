"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
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

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  async function handleSignIn() {
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    setLoading(true);
    setLoadingMode("syncing");
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setLoadingMode(null);
      setError("Wrong email or password.");
      return;
    }

    router.push("/dashboard");
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

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone },
      },
    });

    setLoading(false);
    setLoadingMode(null);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setStep("otp");
    setMessage(`We sent a 6-digit code to ${email}.`);
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setLoadingMode("syncing");
    setError("");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setLoading(false);
      setLoadingMode(null);
      setError(oauthError.message);
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);
    setLoadingMode(null);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(`Password reset link sent to ${email}.`);
  }

  async function handleVerifyOtp() {
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setLoadingMode("verifying");
    setError("");

    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    if (otpError) {
      setLoading(false);
      setLoadingMode(null);
      setError("Invalid or expired code. Try again.");
      return;
    }

    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "forgot") return handleForgotPassword();
    if (step === "otp") return handleVerifyOtp();
    if (isSignUp) return handleSignUp();
    return handleSignIn();
  }

  const title =
    step === "otp" ? "Verify your email"
    : step === "forgot" ? "Reset your password"
    : isSignUp ? "Create your account"
    : "Welcome back";

  const subtitle =
    step === "otp" ? "Enter the code sent to your inbox."
    : step === "forgot" ? "We will send a secure reset link."
    : isSignUp ? "Start your personal finance workspace."
    : "Sign in to Jamal's Finance.";

  return (
    <main className="chat-auth-shell grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-[430px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-[22px] bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <BarChart3 size={24} />
          </div>
          <h1 className="text-[28px] font-semibold tracking-normal text-slate-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>

        <div className="chat-auth-card">
          {step !== "auth" && (
            <button
              type="button"
              onClick={() => {
                setStep("auth");
                setOtp("");
                resetFeedback();
              }}
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {step === "auth" && isSignUp && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="chat-auth-input"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number (optional)"
                  className="chat-auth-input"
                />
              </>
            )}

            {step !== "otp" && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="chat-auth-input"
              />
            )}

            {step === "auth" && (
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="chat-auth-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((value) => !value)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            )}

            {step === "otp" && (
              <div>
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <MailCheck size={16} />
                    Check your inbox
                  </div>
                  <p className="mt-1 text-xs leading-5">{message}</p>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  maxLength={6}
                  className="chat-auth-input text-center text-2xl font-semibold tracking-[0.35em]"
                />
              </div>
            )}

            {message && step !== "otp" && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="chat-auth-button">
              {loading ?
                <LoaderCircle className="h-4 w-4 animate-spin" />
              : null}
              {step === "forgot" ? "Send reset link"
              : step === "otp" ? "Verify email"
              : isSignUp ? "Create account"
              : "Continue"}
            </button>
          </form>

          {step === "auth" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">OR</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <ShieldCheck size={17} />
                Continue with Google
              </button>

              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("forgot");
                    resetFeedback();
                  }}
                  className="mt-5 w-full text-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
                >
                  Forgot password?
                </button>
              )}
            </>
          )}
        </div>

        {step === "auth" && (
          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignUp ? "Already have an account?" : "Do not have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignUp((value) => !value);
                resetFeedback();
              }}
              className="font-semibold text-slate-950 hover:underline"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          Protected by Supabase Auth. Built for a private, professional finance
          workspace.
        </p>
      </div>

      <AnimatePresence>
        {loadingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 grid place-items-center bg-white/72 px-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-xs rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
            >
              <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-slate-950" />
              <p className="mt-5 text-base font-semibold text-slate-950">
                {loadingMode === "creating" ? "Creating your account"
                : loadingMode === "sending" ? "Sending secure link"
                : loadingMode === "verifying" ? "Verifying code"
                : "Signing you in"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Please wait a moment.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
