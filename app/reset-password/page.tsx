"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. Redirecting to your dashboard...");
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1118] px-4 py-8 text-white">
      <div className="pointer-events-none fixed left-[8%] top-[-10%] h-80 w-80 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-cyan-300 text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.22)]">
            <BarChart3 size={21} />
          </div>
          <div>
            <span className="block text-xl font-bold text-white">
              Jamal's Finance
            </span>
            <span className="block text-xs text-slate-500">
              Secure password reset
            </span>
          </div>
        </div>

        <div className="finance-panel p-6 sm:p-8">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-3xl bg-white/[0.06] text-cyan-200">
            <LockKeyhole size={20} />
          </div>
          <h1 className="text-lg font-semibold text-white">Set new password</h1>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Choose a new password for your finance workspace.
          </p>

          <form onSubmit={handleReset} className="mt-5 space-y-4">
            <div>
              <label className="field-label">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="field-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="field-input"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="primary-action w-full py-4"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
