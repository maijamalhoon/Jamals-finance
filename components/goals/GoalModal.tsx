"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ExistingGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: ExistingGoal;
}

export default function GoalModal({ open, onClose, onSuccess, goal }: Props) {
  const supabase = createClient();
  const isEditing = !!goal;

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setCurrentAmount(String(goal.current_amount));
      setDeadline(goal.deadline || "");
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
    }
    setError("");
  }, [open, goal]);

  async function handleSave() {
    if (!name.trim() || !targetAmount) {
      setError("Goal name and target amount are required.");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
    };

    const { error: e } =
      isEditing ?
        await supabase.from("goals").update(payload).eq("id", goal!.id)
      : await supabase.from("goals").insert(payload);

    setLoading(false);
    if (e) {
      setError("Failed to save. Try again.");
      return;
    }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border border-gray-800 text-white max-w-sm p-0 gap-0">
        <DialogHeader className="p-5 border-b border-gray-800">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Goal" : "New Goal"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Goal Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New House, Emergency Fund"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Target Amount (PKR)
            </label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="5000000"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Saved So Far */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Saved So Far (PKR)
            </label>
            <input
              type="number"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm font-semibold outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Deadline (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              style={{ colorScheme: "dark" }}
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
              "Update Goal"
            : "Create Goal"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
