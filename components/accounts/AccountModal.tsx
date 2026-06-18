"use client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash Wallet" },
  { value: "freelance", label: "Freelance" },
  { value: "investment", label: "Investment" },
];

export interface ExistingAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: ExistingAccount;
}

export default function AccountModal({
  open,
  onClose,
  onSuccess,
  account,
}: Props) {
  const supabase = createClient();
  const isEditing = !!account;

  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill when editing, reset when adding
  useEffect(() => {
    if (!open) return;
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(String(account.balance));
    } else {
      setName("");
      setType("bank");
      setBalance("");
    }
    setError("");
  }, [open, account]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Enter an account name.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Not logged in. Please sign in again.");
      toast.error("Please sign in again");
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      type,
      balance: parseFloat(balance) || 0,
    };

    const { error: e } =
      isEditing ?
        await supabase.from("accounts").update(payload).eq("id", account!.id)
      : await supabase.from("accounts").insert(payload);

    setLoading(false);
    // Replace the if/else at the bottom of handleSave:
    if (e) {
      setError("Failed to save. Try again.");
      toast.error("Failed to save account");
      return;
    }
    toast.success(isEditing ? "Account updated!" : "Account added!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border border-gray-800 text-white max-w-sm p-0 gap-0">
        <DialogHeader className="p-5 border-b border-gray-800">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Account" : "Add Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Account Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bank Alfalah"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Account Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              style={{ colorScheme: "dark" }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Balance */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              {isEditing ? "Current Balance (PKR)" : "Opening Balance (PKR)"}
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ?
              "Saving…"
            : isEditing ?
              "Update Account"
            : "Add Account"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
