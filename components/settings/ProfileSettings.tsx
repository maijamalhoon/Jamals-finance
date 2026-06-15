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
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-4">Profile</h3>

      <div className="space-y-4">
        {/* Email — read only */}
        <div>
          <label className="text-gray-400 text-xs block mb-1.5">Email</label>
          <input
            value={email}
            disabled
            className="w-full bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed"
          />
        </div>

        {/* Change Password */}
        <div className="border-t border-gray-800/50 pt-4">
          <p className="text-gray-400 text-xs font-medium mb-3">
            Change Password
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
              />
            </div>
          </div>

          {error && <p className="text-red-400   text-xs mt-2">{error}</p>}
          {message && <p className="text-green-400 text-xs mt-2">{message}</p>}

          <button
            onClick={handlePasswordChange}
            disabled={loading}
            className="mt-3 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
