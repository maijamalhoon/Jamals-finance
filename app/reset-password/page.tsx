"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

function getResetPasswordError(message?: string) {
  const lower = message?.toLowerCase() ?? "";

  if (lower.includes("expired") || lower.includes("invalid")) {
    return "Your reset link may be expired. Request a new password reset link and try again.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many reset attempts. Please wait a moment and try again.";
  }

  if (lower.includes("password")) {
    return "Choose a stronger password and try again.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection failed. Check your internet and try again.";
  }

  return "We could not update your password. Please try again.";
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset(e: FormEvent) {
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
      setError(getResetPasswordError(updateError.message));
      return;
    }

    setMessage("Password updated. Redirecting to your dashboard...");
    setTimeout(() => router.push("/dashboard"), 900);
  }

  return (
    <main className="jf-auth-page jf-login-polish relative grid min-h-dvh place-items-center overflow-hidden px-4 py-8 text-[var(--jf-auth-text)]">
      <div className="jf-auth-grid pointer-events-none absolute inset-0" />
      <div className="jf-auth-accent-line pointer-events-none absolute inset-x-0 top-0 h-1" />

      <motion.section
        initial={{ opacity: 0, y: 12, scale: 0.992 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="jf-auth-icon mb-5 h-14 w-14 rounded-[22px]">
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-[28px] font-semibold text-[var(--jf-auth-text)]">
            Set new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--jf-auth-muted)]">
            Choose a new password for Jamal's Finance.
          </p>
        </div>

        <div className="jf-auth-card relative overflow-hidden p-5 sm:p-6">
          <div className="jf-auth-icon relative z-10 mb-5">
            <LockKeyhole size={20} />
          </div>

          <form
            onSubmit={handleReset}
            className="relative z-10 mt-5 space-y-4"
            aria-busy={loading}
          >
            <div>
              <label
                htmlFor="new-password"
                className="jf-auth-label"
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
                  disabled={loading}
                  className="jf-auth-input jf-auth-input-with-end"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={loading}
                  className="jf-auth-password-toggle absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-[var(--jf-auth-subtle)] transition-colors hover:bg-[var(--jf-auth-panel-hover)] hover:text-[var(--jf-auth-text)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-active/30"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="jf-auth-label"
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
                disabled={loading}
                className="jf-auth-input"
              />
            </div>

            {message && (
              <p
                aria-live="polite"
                data-tone="success"
                className="jf-auth-feedback"
              >
                {message}
              </p>
            )}
            {error && (
              <p
                role="alert"
                data-tone="error"
                className="jf-auth-feedback"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="jf-auth-action jf-auth-primary"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? "Updating..." : "Update Password"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </button>

            <div className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--jf-auth-subtle)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
              <span>Protected by Supabase Auth and secure sessions.</span>
            </div>
          </form>
        </div>
      </motion.section>
    </main>
  );
}
