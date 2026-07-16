"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_COLOR_PALETTE as COLORS,
  getReadableTextColor,
} from "@/lib/theme-colors";

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  parent_id: string | null;
}

interface CategoryStat {
  monthAmount: number;
  totalAmount: number;
  count: number;
}

export default function CategoriesSettings({
  categories,
  categoryStats,
}: {
  categories: Category[];
  categoryStats: Record<string, CategoryStat>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [addingFor, setAddingFor] = useState<"income" | "expense" | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(COLORS[0]);
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(COLORS[0]);
  const [editParentId, setEditParentId] = useState("");
  const [saving, setSaving] = useState(false);

  const income = categories.filter((category) => category.type === "income");
  const expense = categories.filter((category) => category.type === "expense");

  const fmt = (amount: number) => formatCurrency(amount);

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
      parent_id: addingFor === "expense" && parentId ? parentId : null,
    });
    setSaving(false);
    setNewName("");
    setNewColor(COLORS[0]);
    setParentId("");
    setAddingFor(null);
    router.refresh();
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditParentId(category.parent_id ?? "");
    setAddingFor(null);
  }

  async function handleUpdate(category: Category) {
    if (!editName.trim()) return;
    setSaving(true);
    await supabase
      .from("categories")
      .update({
        name: editName.trim(),
        color: editColor,
        parent_id:
          category.type === "expense" && editParentId ? editParentId : null,
      })
      .eq("id", category.id);
    setSaving(false);
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Existing transactions may still use it.`)) {
      return;
    }
    await supabase.from("categories").delete().eq("id", id);
    router.refresh();
  }

  function ColorPicker({
    value,
    onChange,
  }: {
    value: string;
    onChange: (color: string) => void;
  }) {
    return (
      <div className="flex flex-wrap gap-2">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="finance-focus grid h-7 w-7 place-items-center rounded-full transition-transform hover:scale-110"
            style={{
              background: color,
              color: getReadableTextColor(color),
              outline: value === color ? "2px solid var(--card)" : "none",
              outlineOffset: "2px",
            }}
            aria-label={`Pick ${color}`}
          >
            {value === color && <Check size={12} />}
          </button>
        ))}
      </div>
    );
  }

  function ParentPicker({
    roots,
    value,
    onChange,
    excludeId,
  }: {
    roots: Category[];
    value: string;
    onChange: (id: string) => void;
    excludeId?: string;
  }) {
    const choices = roots.filter((root) => root.id !== excludeId);
    return (
      <div>
        <p className="mb-2 text-[11px] font-medium text-text-secondary">
          Parent category
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange("")}
            className={`finance-focus rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              !value
                ? "border-border bg-card text-text-primary"
                : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
          >
            Top level
          </button>
          {choices.map((root) => (
            <button
              key={root.id}
              type="button"
              onClick={() => onChange(root.id)}
              className={`finance-focus rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                value === root.id
                  ? "border-border bg-card text-text-primary"
                  : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
              }`}
            >
              {root.name}
            </button>
          ))}
        </div>
      </div>
    );
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
    const roots = items.filter((item) => !item.parent_id);
    const childrenByParent = items.reduce<Record<string, Category[]>>(
      (acc, item) => {
        if (!item.parent_id) return acc;
        acc[item.parent_id] = [...(acc[item.parent_id] ?? []), item];
        return acc;
      },
      {},
    );

    const getCategoryStat = (category: Category) => {
      const childIds = (childrenByParent[category.id] ?? []).map(
        (child) => child.id,
      );
      return [category.id, ...childIds].reduce<CategoryStat>(
        (acc, id) => {
          const stat = categoryStats[id];
          if (!stat) return acc;
          return {
            monthAmount: acc.monthAmount + stat.monthAmount,
            totalAmount: acc.totalAmount + stat.totalAmount,
            count: acc.count + stat.count,
          };
        },
        { monthAmount: 0, totalAmount: 0, count: 0 },
      );
    };

    const renderEditor = (category: Category) => (
      <div className="rounded-[24px] border border-border bg-surface-secondary p-3">
        <Input
          value={editName}
          onChange={(event) => setEditName(event.target.value)}
          placeholder="Category name"
        />
        {category.type === "expense" && (
          <div className="mt-3">
            <ParentPicker
              roots={roots}
              value={editParentId}
              onChange={setEditParentId}
              excludeId={category.id}
            />
          </div>
        )}
        <div className="mt-3">
          <ColorPicker value={editColor} onChange={setEditColor} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            onClick={() => handleUpdate(category)}
            disabled={saving || !editName.trim()}
            className="primary-action min-h-0 rounded-[14px] px-3 py-2 text-xs"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditingId(null)}
            className="finance-focus inline-flex items-center gap-1 rounded-[14px] border border-border bg-surface-secondary px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-hover hover:text-text-primary"
          >
            <X size={12} />
            Cancel
          </Button>
        </div>
      </div>
    );

    const renderCategory = (category: Category, nested = false) => {
      const stat = getCategoryStat(category);
      const label = type === "expense" ? "spent" : "received";

      if (editingId === category.id) {
        return (
          <div key={category.id} className={nested ? "ml-5" : ""}>
            {renderEditor(category)}
          </div>
        );
      }

      return (
        <div
          key={category.id}
          className={`group rounded-[22px] border border-border bg-surface-secondary p-3 transition-colors hover:border-border hover:bg-hover ${
            nested ? "ml-5" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ background: category.color }}
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text-primary">
                {category.name}
              </span>
              <span className="text-[11px] text-text-secondary">
                {stat.count} records tracked
              </span>
            </div>
            <button
              type="button"
              onClick={() => startEdit(category)}
              className="icon-button h-8 w-8 opacity-0 group-hover:opacity-100"
              aria-label={`Edit ${category.name}`}
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(category.id, category.name)}
              className="finance-focus flex h-8 w-8 items-center justify-center rounded-[14px] text-danger opacity-0 transition-all hover:bg-danger/10 group-hover:opacity-100"
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[18px] border border-border bg-surface px-3 py-2">
              <p className="text-[10px] uppercase text-text-secondary">
                This month
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-text-primary">
                {fmt(stat.monthAmount)}
              </p>
            </div>
            <div className="rounded-[18px] border border-border bg-surface px-3 py-2">
              <p className="text-[10px] uppercase text-text-secondary">
                Total {label}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-text-primary">
                {fmt(stat.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {title}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              Add, edit, delete, and track totals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddingFor(type);
              setEditingId(null);
              setNewName("");
              setNewColor(COLORS[0]);
              setParentId("");
            }}
            className="finance-focus flex items-center gap-1.5 rounded-[16px] border border-border bg-surface-secondary px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="space-y-2">
          {roots.map((category) => (
            <div key={category.id} className="space-y-2">
              {renderCategory(category)}
              {(childrenByParent[category.id] ?? []).map((child) =>
                renderCategory(child, true),
              )}
            </div>
          ))}
        </div>

        {addingFor === type && (
          <div className="mt-3 space-y-3 rounded-[24px] border border-border bg-surface-secondary p-3">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Category name"
            />
            {type === "expense" && (
              <ParentPicker
                roots={roots}
                value={parentId}
                onChange={setParentId}
              />
            )}
            <ColorPicker value={newColor} onChange={setNewColor} />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="primary-action min-h-0 rounded-[14px] px-3 py-2 text-xs"
              >
                {saving ? "Saving..." : "Save category"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddingFor(null)}
                className="finance-focus rounded-[14px] border border-border bg-surface-secondary px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="finance-panel min-w-0 p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Categories</h3>
          <p className="mt-1 text-xs text-text-secondary">
            Full control over income sources and expense groups.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-secondary px-3 py-1 text-[11px] font-semibold text-text-secondary">
          {categories.length} total
        </span>
      </div>
      <div className="space-y-7">
        <Section title="Income Categories" items={income} type="income" />
        <Section title="Expense Categories" items={expense} type="expense" />
      </div>
    </div>
  );
}
