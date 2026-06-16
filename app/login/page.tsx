"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff } from "lucide-react";

type Step = "auth" | "otp";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<Step>("auth");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ── Sign In ──────────────────────────────────────
  async function handleSignIn() {
    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: e } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (e) {
      setError("Wrong email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  // ── Sign Up → send OTP ────────────────────────────
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
    setError("");

    const { error: e } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, phone },
      },
    });

    setLoading(false);
    if (e) {
      setError(e.message);
    } else {
      setStep("otp");
      setMessage(`We sent a 6-digit code to ${email}. Check your inbox.`);
    }
  }

  // ── Verify OTP ───────────────────────────────────
  async function handleVerifyOtp() {
    if (!otp || otp.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: e } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "signup",
    });

    setLoading(false);
    if (e) {
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
    <main className="min-h-screen bg-[#0B0D17] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <BarChart3 size={24} className="text-indigo-500" />
          <span className="text-white font-bold text-xl">Jamal's Finance</span>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-7">
          {/* OTP Step */}
          {step === "otp" ?
            <>
              <h2 className="text-white font-semibold text-base mb-1">
                Check your email
              </h2>
              <p className="text-gray-500 text-xs mb-5">{message}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">
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
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold tracking-widest outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & Create Account"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("auth");
                    setOtp("");
                    setError("");
                  }}
                  className="w-full text-gray-500 text-xs hover:text-gray-400 transition-colors"
                >
                  ← Back to sign up
                </button>
              </form>
            </>
          : <>
              <h2 className="text-white font-semibold text-base mb-1">
                {isSignUp ? "Create account" : "Welcome back"}
              </h2>
              <p className="text-gray-500 text-xs mb-5">
                {isSignUp ?
                  "Fill in your details to get started"
                : "Sign in to your dashboard"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name — signup only */}
                {isSignUp && (
                  <div>
                    <label className="text-gray-400 text-xs block mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jamal Malhoon"
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
                    />
                  </div>
                )}

                {/* Phone — signup only */}
                {isSignUp && (
                  <div>
                    <label className="text-gray-400 text-xs block mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 300 0000000"
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-gray-400 text-xs block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 pr-10 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPass ?
                        <EyeOff size={15} />
                      : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ?
                    isSignUp ?
                      "Creating account…"
                    : "Signing in…"
                  : isSignUp ?
                    "Create Account"
                  : "Sign In"}
                </button>
              </form>

              <p className="text-center text-gray-600 text-xs mt-4">
                {isSignUp ?
                  "Already have an account?"
                : "Don't have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsSignUp((p) => !p);
                    setError("");
                    setMessage("");
                  }}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </p>
            </>
          }
        </div>
      </div>
    </main>
  );
}
