"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Palette, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCategoryIconOptions } from "@/lib/category-icon-catalog";
import {
  CATEGORY_VISUAL_COLORS,
  CategoryVisualIcon,
  isValidCategoryColor,
  normalizeCategoryColor,
  type CategoryKind,
  type CategoryVisual,
  type NamedCategoryIconKey,
} from "@/lib/category-visuals";

const QUICK_COLORS = CATEGORY_VISUAL_COLORS.slice(0, 10);
const RECENT_ICON_STORAGE_KEY = "jf-category-recent-icons";

function readRecentIcons(): NamedCategoryIconKey[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_ICON_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is NamedCategoryIconKey => typeof value === "string")
      .slice(0, 8);
  } catch {
    return [];
  }
}

function rememberIcon(iconKey: NamedCategoryIconKey) {
  if (typeof window === "undefined") return;

  try {
    const next = [iconKey, ...readRecentIcons().filter((item) => item !== iconKey)].slice(
      0,
      8,
    );
    window.localStorage.setItem(RECENT_ICON_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage is an enhancement only. Category saving remains unaffected.
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: CategoryKind;
  categoryName: string;
  value: CategoryVisual;
  onApply: (value: CategoryVisual) => void;
};

export default function CategoryAppearancePicker({
  open,
  onOpenChange,
  type,
  categoryName,
  value,
  onApply,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const [hexDraft, setHexDraft] = useState(normalizeCategoryColor(value.color));
  const [recentIcons, setRecentIcons] = useState<NamedCategoryIconKey[]>([]);

  useEffect(() => {
    if (!open) return;
    const normalizedColor = normalizeCategoryColor(value.color);
    setDraft({ ...value, color: normalizedColor });
    setHexDraft(normalizedColor);
    setQuery("");
    setRecentIcons(readRecentIcons());
  }, [open, value]);

  const searchOptions = useMemo(
    () => getCategoryIconOptions(type, query),
    [query, type],
  );

  const suggestedOptions = useMemo(() => {
    const suggestions = getCategoryIconOptions(type, categoryName.trim());
    if (suggestions.length > 0) return suggestions.slice(0, 6);
    return getCategoryIconOptions(type).slice(0, 6);
  }, [categoryName, type]);

  const recentOptions = useMemo(() => {
    const allOptions = getCategoryIconOptions(type);
    const optionByKey = new Map(allOptions.map((entry) => [entry.iconKey, entry]));
    return recentIcons
      .map((iconKey) => optionByKey.get(iconKey))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [recentIcons, type]);

  function selectColor(color: string) {
    if (!isValidCategoryColor(color)) return;
    const normalized = normalizeCategoryColor(color);
    setDraft((current) => ({ ...current, color: normalized }));
    setHexDraft(normalized);
  }

  function updateHex(raw: string) {
    const upper = raw.toUpperCase();
    setHexDraft(upper);
    const candidate = upper.startsWith("#") ? upper : `#${upper}`;
    if (isValidCategoryColor(candidate)) {
      setDraft((current) => ({
        ...current,
        color: normalizeCategoryColor(candidate),
      }));
    }
  }

  function selectIcon(iconKey: NamedCategoryIconKey) {
    setDraft((current) => ({ ...current, iconKey }));
  }

  function apply() {
    rememberIcon(draft.iconKey);
    onApply({ ...draft, color: normalizeCategoryColor(draft.color) });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[min(90svh,48rem)] w-full max-w-2xl gap-0 overflow-hidden rounded-t-[28px] border-x border-t border-border bg-card p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-4 pr-14 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <CategoryVisualIcon
              color={draft.color}
              iconKey={draft.iconKey}
              label={categoryName || `New ${type}`}
              size="md"
            />
            <div className="min-w-0">
              <SheetTitle className="text-base font-black text-text-primary">
                Icon and color
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs text-text-secondary">
                Choose one clear visual for this {type} category.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          <section aria-labelledby="category-color-heading">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3
                id="category-color-heading"
                className="text-xs font-black uppercase tracking-[0.14em] text-text-secondary"
              >
                Color
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(event) => selectColor(event.target.value)}
                  aria-label="Choose custom category color"
                  className="finance-focus size-9 cursor-pointer rounded-[10px] border border-border bg-surface-secondary p-1"
                />
                <div className="relative">
                  <Palette
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                    aria-hidden="true"
                  />
                  <input
                    value={hexDraft}
                    onChange={(event) => updateHex(event.target.value)}
                    onBlur={() => setHexDraft(normalizeCategoryColor(draft.color))}
                    aria-label="Category color hex value"
                    inputMode="text"
                    className="field-input min-h-9 w-28 pl-8 text-xs font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {QUICK_COLORS.map((color) => {
                const selected = normalizeCategoryColor(draft.color) === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => selectColor(color)}
                    aria-label={`Use color ${color}`}
                    aria-pressed={selected}
                    className="finance-focus grid aspect-square min-h-10 place-items-center rounded-full border border-black/5 transition-transform hover:scale-105"
                    style={{ backgroundColor: color }}
                  >
                    {selected ? (
                      <Check
                        size={16}
                        strokeWidth={3}
                        className="text-white drop-shadow"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="category-icon-heading">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3
                id="category-icon-heading"
                className="text-xs font-black uppercase tracking-[0.14em] text-text-secondary"
              >
                Icon
              </h3>
              <span className="text-[11px] font-semibold text-text-tertiary">
                {searchOptions.length} available
              </span>
            </div>

            <div className="relative mb-3">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${type} icons`}
                aria-label={`Search ${type} category icons`}
                className="field-input min-h-11 w-full pl-10"
              />
            </div>

            {!query && suggestedOptions.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold text-text-secondary">
                  Suggested
                </p>
                <IconGrid
                  entries={suggestedOptions}
                  selectedIconKey={draft.iconKey}
                  color={draft.color}
                  onSelect={selectIcon}
                />
              </div>
            ) : null}

            {!query && recentOptions.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold text-text-secondary">
                  Recently used
                </p>
                <IconGrid
                  entries={recentOptions}
                  selectedIconKey={draft.iconKey}
                  color={draft.color}
                  onSelect={selectIcon}
                />
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[11px] font-bold text-text-secondary">
                {query ? "Search results" : "All icons"}
              </p>
              {searchOptions.length > 0 ? (
                <IconGrid
                  entries={searchOptions}
                  selectedIconKey={draft.iconKey}
                  color={draft.color}
                  onSelect={selectIcon}
                />
              ) : (
                <div className="rounded-[16px] border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-bold text-text-primary">No icon found</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Try another finance-related word.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <SheetFooter className="border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5">
          <Button type="button" size="lg" onClick={apply} className="w-full">
            Apply appearance
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type IconEntry = ReturnType<typeof getCategoryIconOptions>[number];

function IconGrid({
  entries,
  selectedIconKey,
  color,
  onSelect,
}: {
  entries: readonly IconEntry[];
  selectedIconKey: NamedCategoryIconKey;
  color: string;
  onSelect: (iconKey: NamedCategoryIconKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {entries.map((entry) => {
        const selected = selectedIconKey === entry.iconKey;
        return (
          <button
            key={`${entry.iconKey}:${entry.label}`}
            type="button"
            onClick={() => onSelect(entry.iconKey)}
            aria-label={`Use ${entry.label} icon`}
            aria-pressed={selected}
            className={`finance-focus relative flex min-h-[5rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[16px] border px-1.5 py-2 text-center transition-colors ${
              selected
                ? "border-active/55 bg-active/10"
                : "border-border bg-surface-secondary hover:border-active/25 hover:bg-hover"
            }`}
          >
            <CategoryVisualIcon
              color={color}
              iconKey={entry.iconKey}
              label={entry.label}
              size="sm"
            />
            <span className="line-clamp-1 w-full text-[10px] font-bold leading-4 text-text-secondary">
              {entry.label}
            </span>
            {selected ? (
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-active text-text-inverse">
                <Check size={10} strokeWidth={3} aria-hidden="true" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
