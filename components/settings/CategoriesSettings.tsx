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
    await supabase
      .from("categories")
      .insert({ name: newName.trim(), type: addingFor, color: newColor });
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
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-gray-400 text-xs font-medium">{title}</p>
          <button
            onClick={() => {
              setAddingFor(type);
              setNewName("");
              setNewColor(COLORS[0]);
            }}
            className="flex items-center gap-1 text-indigo-400 text-xs hover:text-indigo-300 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        </div>

        <div className="space-y-1.5">
          {items.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-800/40 rounded-xl group"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: cat.color }}
              />
              <span className="text-white text-sm flex-1">{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-all"
              >
                <Trash2 size={11} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>

        {/* Inline add form */}
        {addingFor === type && (
          <div className="mt-2 p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 placeholder-gray-600"
            />
            {/* Color swatches */}
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: newColor === c ? "2px solid white" : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setAddingFor(null)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
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
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-5">Categories</h3>
      <div className="space-y-6">
        <Section title="Income Categories" items={income} type="income" />
        <Section title="Expense Categories" items={expense} type="expense" />
      </div>
    </div>
  );
}
