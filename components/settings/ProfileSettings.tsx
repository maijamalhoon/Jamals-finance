"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileSettings({ email }: { email: string }) {
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordChange() {
    if (!newPassword || !confirmPassword) {
      setError("Fill in both fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Minimum 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const { error: e } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);
    if (e) {
      setError(e.message);
    } else {
      setMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="finance-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Profile</h3>

      <div className="space-y-4">
        <div>
          <label className="field-label">Email</label>
          <input
            value={email}
            disabled
            className="field-input cursor-not-allowed opacity-60"
          />
        </div>

        <div className="border-t border-white/[0.08] pt-4">
          <p className="mb-3 text-xs font-medium text-slate-400">
            Change Password
          </p>

          <div className="space-y-3">
            <div>
              <label className="field-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="field-input"
              />
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          {message && (
            <p className="mt-2 text-xs text-emerald-300">{message}</p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={loading}
            className="primary-action mt-3"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
