"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const COLORS = [
  "#22c55e",
  "#ef4444",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
  "#6b7280",
];

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

export default function CategoriesSettings({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [addingFor, setAddingFor] = useState<"income" | "expense" | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  async function handleAdd() {
    if (!newName.trim() || !addingFor) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("categories").insert({
      user_id: user!.id,
      name: newName.trim(),
      type: addingFor,
      color: newColor,
    });
    setSaving(false);
    setNewName("");
    setNewColor(COLORS[0]);
    setAddingFor(null);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from("categories").delete().eq("id", id);
    router.refresh();
  }

  function Section({
    title,
    items,
    type,
  }: {
    title: string;
    items: Category[];
    type: "income" | "expense";
  }) {
    return (
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <button
            onClick={() => {
              setAddingFor(type);
              setNewName("");
              setNewColor(COLORS[0]);
            }}
            className="finance-focus flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-300/10"
          >
            <Plus size={12} /> Add
          </button>
        </div>

        <div className="space-y-1.5">
          {items.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.045] px-3 py-2.5"
            >
              <div
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: cat.color }}
              />
              <span className="flex-1 text-sm text-white">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="flex h-7 w-7 items-center justify-center rounded-xl opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 size={11} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>

        {addingFor === type && (
          <div className="mt-2 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="field-input py-2"
            />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: newColor === c ? "2px solid white" : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Pick ${c}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="primary-action px-3 py-1.5 text-xs"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setAddingFor(null)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.055] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/[0.09]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="finance-panel p-5">
      <h3 className="mb-5 text-sm font-semibold text-white">Categories</h3>
      <div className="space-y-6">
        <Section title="Income Categories" items={income} type="income" />
        <Section title="Expense Categories" items={expense} type="expense" />
      </div>
    </div>
  );
}
