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
import { ACCOUNT_TYPES } from "@/lib/finance-options";

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
      <DialogContent className="finance-glass-panel max-w-sm gap-0 p-0 text-white">
        <DialogHeader className="border-b border-white/[0.08] p-5">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Account" : "Add Account"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="field-label">Account Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bank Alfalah"
              className="field-input"
            />
          </div>

          {/* Type */}
          <div>
            <label className="field-label">Account Type</label>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon, tone }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`finance-focus flex items-center gap-2 rounded-[18px] border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                    type === value
                      ? "border-white bg-white text-[#111318]"
                      : "border-white/[0.10] bg-white/[0.055] text-slate-400 hover:bg-white/[0.09] hover:text-white"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[15px] ${
                      type === value ? "bg-slate-950 text-white" : tone
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="field-label">
              {isEditing ? "Current Balance (PKR)" : "Opening Balance (PKR)"}
            </label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0"
              className="field-input font-semibold"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="primary-action w-full py-3"
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
