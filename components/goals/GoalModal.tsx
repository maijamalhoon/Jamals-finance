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
import DatePicker from "@/components/ui/date-picker";
import { GOAL_ICONS } from "./goal-icons";

export interface ExistingGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
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
  const [icon, setIcon] = useState("target");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setName(goal.name);
      setTargetAmount(String(goal.target_amount));
      setCurrentAmount(String(goal.current_amount));
      setDeadline(goal.deadline || "");
      setIcon(goal.icon || "target");
    } else {
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setDeadline("");
      setIcon("target");
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      user_id: user!.id,
      name: name.trim(),
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount) || 0,
      deadline: deadline || null,
      icon,
    };

    const { error: e } =
      isEditing ?
        await supabase.from("goals").update(payload).eq("id", goal!.id)
      : await supabase.from("goals").insert(payload);

    setLoading(false);
    // Replace the if/else at the bottom of handleSave:
    if (e) {
      setError("Failed to save. Try again.");
      toast.error("Failed to save goal");
      return;
    }
    toast.success(isEditing ? "Goal updated!" : "Goal created!");
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
          {/* Icon Picker */}
          <div>
            <label className="text-gray-400 text-xs block mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setIcon(value)}
                  title={label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    icon === value ?
                      "bg-indigo-600/20 border-indigo-500/50 text-indigo-400"
                    : "bg-gray-800/50 border-gray-700/50 text-gray-500 hover:text-white hover:border-gray-600"
                  }`}
                >
                  <Icon size={16} />
                  <span className="text-[9px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

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
            <DatePicker
              value={deadline}
              onChange={setDeadline}
              placeholder="Select deadline"
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
