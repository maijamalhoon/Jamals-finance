"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Eye, EyeOff, LoaderCircle } from "lucide-react";

type Step = "auth" | "otp";
type LoadingMode = "syncing" | "creating" | "verifying" | null;

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
    if (step === "otp") return handleVerifyOtp();
    if (isSignUp) return handleSignUp();
    return handleSignIn();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#121318] px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/20">
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

        <div className="finance-panel p-7 sm:p-8">
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
                    className="w-full finance-control px-5 py-4 text-center text-2xl font-bold tracking-widest text-white outline-none placeholder-slate-700 focus:border-cyan-300"
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
                  className="w-full rounded-3xl bg-cyan-400 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition-colors hover:bg-cyan-300 disabled:opacity-50"
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
                    <label className="text-slate-300 text-xs block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jamal Malhoon"
                      className="w-full finance-control px-5 py-4 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-300"
                    />
                  </div>
                )}

                {isSignUp && (
                  <div>
                    <label className="text-slate-300 text-xs block mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 0000000"
                      className="w-full finance-control px-5 py-4 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-300"
                    />
                  </div>
                )}

                <div>
                  <label className="text-slate-300 text-xs block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full finance-control px-5 py-4 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-300"
                  />
                </div>

                <div>
                  <label className="text-slate-300 text-xs block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full finance-control px-5 py-4 pr-12 text-sm text-white outline-none placeholder-slate-600 focus:border-cyan-300"
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
                  className="mt-1 w-full rounded-3xl bg-cyan-400 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/25 transition-colors hover:bg-cyan-300 disabled:opacity-50"
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
