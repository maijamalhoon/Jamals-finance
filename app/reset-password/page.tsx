"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MotionReveal from "@/components/motion/MotionReveal";

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
    <main className="chat-auth-shell grid min-h-screen place-items-center px-4 py-8">
      <MotionReveal className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="finance-icon-bubble mb-5 h-14 w-14 rounded-[22px]">
            <BarChart3 size={24} />
          </div>
          <h1 className="text-[28px] font-semibold text-text-primary">
            Set new password
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Choose a new password for Jamal's Finance.
          </p>
        </div>

        <div className="chat-auth-card">
          <div className="finance-status-info mb-5 grid h-12 w-12 place-items-center rounded-2xl border">
            <LockKeyhole size={20} />
          </div>

          <form onSubmit={handleReset} className="mt-5 space-y-4" aria-busy={loading}>
            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="chat-auth-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="finance-focus absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="chat-auth-input"
              />
            </div>

            {message && (
              <p
                aria-live="polite"
                className="finance-status-success rounded-2xl border p-3 text-sm"
              >
                {message}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="finance-status-danger rounded-2xl border p-3 text-sm"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="chat-auth-button"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </MotionReveal>
    </main>
  );
}
