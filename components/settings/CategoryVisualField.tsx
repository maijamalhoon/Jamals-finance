"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Palette, Search, X } from "@/components/icons/jalvoro/compat";

import {
  CATEGORY_ICON_CATALOG,
  CATEGORY_ICON_GROUPS,
  getCategoryIconOptions,
  type CategoryIconGroup,
} from "@/lib/category-icon-catalog";
import {
  CATEGORY_VISUAL_COLORS,
  CategoryColorDot,
  CategoryVisualIcon,
  getSemanticCategoryIconKey,
  isValidCategoryColor,
  normalizeCategoryColor,
  type CategoryKind,
  type CategoryVisual,
  type NamedCategoryIconKey,
} from "@/lib/category-visuals";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const QUICK_COLORS = CATEGORY_VISUAL_COLORS.slice(0, 10);
const RECENT_ICON_STORAGE_KEY = "jamals-category-recent-icons";

type Props = {
  id: string;
  name: string;
  type: CategoryKind;
  visual: CategoryVisual;
  onNameChange: (value: string) => void;
  onVisualChange: (visual: CategoryVisual) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

type IconFilter = CategoryIconGroup | "all";

function formatIconLabel(iconKey: string) {
  return iconKey
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getIconLabel(iconKey: NamedCategoryIconKey) {
  return (
    CATEGORY_ICON_CATALOG.find((entry) => entry.iconKey === iconKey)?.label ??
    formatIconLabel(iconKey)
  );
}

function readRecentIcons() {
  if (typeof window === "undefined") return [] as NamedCategoryIconKey[];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_ICON_STORAGE_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(CATEGORY_ICON_CATALOG.map((entry) => entry.iconKey));
    return parsed
      .filter(
        (value): value is NamedCategoryIconKey =>
          typeof value === "string" &&
          valid.has(value as NamedCategoryIconKey),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

function IconButton({
  iconKey,
  label,
  color,
  selected,
  onClick,
}: {
  iconKey: NamedCategoryIconKey;
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Use ${label} icon`}
      aria-pressed={selected}
      className={`finance-focus relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[16px] border px-1.5 py-3 transition-colors ${
        selected
          ? "border-active/55 bg-active/10"
          : "border-border bg-surface-secondary hover:border-active/25 hover:bg-hover"
      }`}
    >
      <CategoryVisualIcon
        color={color}
        iconKey={iconKey}
        label={label}
        size="sm"
      />
      <span className="w-full truncate text-center text-[10px] font-semibold leading-4 text-text-secondary sm:text-[11px]">
        {label}
      </span>
      {selected ? (
        <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-active text-white">
          <Check size={10} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export default function CategoryVisualField({
  id,
  name,
  type,
  visual,
  onNameChange,
  onVisualChange,
  placeholder = "e.g. Salary, Rent, Fuel",
  autoFocus = false,
  disabled = false,
  ariaLabel,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<IconFilter>("all");
  const [pendingVisual, setPendingVisual] = useState<CategoryVisual>(visual);
  const [hexDraft, setHexDraft] = useState(normalizeCategoryColor(visual.color));
  const [recentIcons, setRecentIcons] = useState<NamedCategoryIconKey[]>([]);

  const suggestedIcon = getSemanticCategoryIconKey(name, type);
  const options = useMemo(
    () => getCategoryIconOptions(type, query, filter),
    [filter, query, type],
  );
  const selectedLabel = getIconLabel(visual.iconKey);

  useEffect(() => {
    if (!pickerOpen) return;
    setPendingVisual(visual);
    setHexDraft(normalizeCategoryColor(visual.color));
    setQuery("");
    setFilter("all");
    setRecentIcons(readRecentIcons());
  }, [pickerOpen, visual]);

  function chooseIcon(iconKey: NamedCategoryIconKey) {
    setPendingVisual((current) => ({ ...current, iconKey }));
  }

  function chooseColor(color: string) {
    if (!isValidCategoryColor(color)) return;
    const normalized = normalizeCategoryColor(color);
    setPendingVisual((current) => ({ ...current, color: normalized }));
    setHexDraft(normalized);
  }

  function handleHexChange(value: string) {
    const draft = value.toUpperCase();
    setHexDraft(draft);
    const candidate = draft.startsWith("#") ? draft : `#${draft}`;
    if (isValidCategoryColor(candidate)) chooseColor(candidate);
  }

  function applyAppearance() {
    onVisualChange(pendingVisual);
    const nextRecent = [
      pendingVisual.iconKey,
      ...recentIcons.filter((item) => item !== pendingVisual.iconKey),
    ].slice(0, 6);
    setRecentIcons(nextRecent);
    try {
      window.localStorage.setItem(
        RECENT_ICON_STORAGE_KEY,
        JSON.stringify(nextRecent),
      );
    } catch {
      // Appearance still applies when browser storage is unavailable.
    }
    setPickerOpen(false);
  }

  const featuredKeys = Array.from(
    new Set([suggestedIcon, ...recentIcons]),
  ).filter((iconKey) =>
    CATEGORY_ICON_CATALOG.some(
      (entry) => entry.iconKey === iconKey && entry.types.includes(type),
    ),
  );

  return (
    <div className="min-w-0" data-category-visual-field="true">
      <div className="flex min-h-12 min-w-0 items-center rounded-[15px] border border-border bg-card px-2.5 transition-colors focus-within:border-active focus-within:ring-3 focus-within:ring-active/15">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={disabled}
          aria-label="Change category icon and color"
          className="finance-focus grid size-10 shrink-0 place-items-center rounded-[11px] hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CategoryVisualIcon
            color={visual.color}
            iconKey={visual.iconKey}
            label={name || `New ${type}`}
            size="xs"
          />
        </button>
        <span aria-hidden="true" className="mx-1.5 h-7 w-px shrink-0 bg-border" />
        <input
          id={id}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={ariaLabel}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-text-primary outline-none placeholder:font-medium placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
        />
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={disabled}
        className="finance-focus mt-2.5 flex min-h-14 w-full min-w-0 items-center gap-3 rounded-[15px] border border-border bg-surface-secondary px-3.5 text-left transition-colors hover:border-active/25 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-card">
          <CategoryVisualIcon
            color={visual.color}
            iconKey={visual.iconKey}
            label={selectedLabel}
            size="xs"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-text-primary">
            Appearance
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <CategoryColorDot color={visual.color} className="size-2" />
            <span className="truncate">{selectedLabel}</span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-active">
          Change <ChevronRight size={15} />
        </span>
      </button>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[92dvh] gap-0 overflow-hidden rounded-t-[28px] border-border bg-card p-0 sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[28px] sm:border"
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-secondary">
                <CategoryVisualIcon
                  color={pendingVisual.color}
                  iconKey={pendingVisual.iconKey}
                  label={getIconLabel(pendingVisual.iconKey)}
                  size="sm"
                />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-bold text-text-primary">
                  Category appearance
                </SheetTitle>
                <p className="mt-0.5 text-xs leading-5 text-text-secondary">
                  Pick one clear icon and color. Financial data stays unchanged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="finance-focus grid size-9 shrink-0 place-items-center rounded-[11px] text-text-secondary hover:bg-hover hover:text-text-primary"
                aria-label="Close appearance picker"
              >
                <X size={18} />
              </button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${type} icons`}
                aria-label={`Search ${type} category icons`}
                className="min-h-11 w-full rounded-[14px] border border-border bg-surface-secondary pl-10 pr-3 text-sm font-medium text-text-primary outline-none placeholder:text-text-tertiary focus:border-active"
              />
            </div>

            <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setFilter("all")}
                aria-pressed={filter === "all"}
                className={`finance-focus shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  filter === "all"
                    ? "bg-active text-white"
                    : "border border-border bg-surface-secondary text-text-secondary hover:bg-hover"
                }`}
              >
                All
              </button>
              {CATEGORY_ICON_GROUPS.map((group) => (
                <button
                  key={group.value}
                  type="button"
                  onClick={() => setFilter(group.value)}
                  aria-pressed={filter === group.value}
                  className={`finance-focus shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    filter === group.value
                      ? "bg-active text-white"
                      : "border border-border bg-surface-secondary text-text-secondary hover:bg-hover"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            {!query && filter === "all" && featuredKeys.length > 0 ? (
              <section className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-secondary">
                  Suggested and recent
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {featuredKeys.map((iconKey) => (
                    <IconButton
                      key={iconKey}
                      iconKey={iconKey}
                      label={getIconLabel(iconKey)}
                      color={pendingVisual.color}
                      selected={pendingVisual.iconKey === iconKey}
                      onClick={() => chooseIcon(iconKey)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-text-secondary">
                {query ? "Search results" : "Icons"}
              </p>
              {options.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {options.map((entry) => (
                    <IconButton
                      key={entry.iconKey}
                      iconKey={entry.iconKey}
                      label={entry.label}
                      color={pendingVisual.color}
                      selected={pendingVisual.iconKey === entry.iconKey}
                      onClick={() => chooseIcon(entry.iconKey)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-bold text-text-primary">
                    No matching icons
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Try another word or icon group.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-5 border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Palette size={16} className="text-text-secondary" />
                <p className="text-sm font-bold text-text-primary">Color</p>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {QUICK_COLORS.map((color) => {
                  const selected =
                    normalizeCategoryColor(pendingVisual.color) === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => chooseColor(color)}
                      aria-label={`Use color ${color}`}
                      aria-pressed={selected}
                      className="finance-focus grid aspect-square min-h-10 place-items-center rounded-full border border-black/5 transition-transform hover:scale-105 sm:min-h-9"
                      style={{ backgroundColor: color }}
                    >
                      {selected ? (
                        <Check
                          size={15}
                          strokeWidth={3}
                          className="text-white drop-shadow"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
                <label className="finance-focus relative grid size-11 cursor-pointer place-items-center overflow-hidden rounded-[13px] border border-border bg-surface-secondary">
                  <input
                    type="color"
                    value={normalizeCategoryColor(pendingVisual.color)}
                    onChange={(event) => chooseColor(event.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label="Choose custom category color"
                  />
                  <CategoryColorDot
                    color={pendingVisual.color}
                    className="size-6 border border-black/10"
                  />
                </label>
                <input
                  value={hexDraft}
                  onChange={(event) => handleHexChange(event.target.value)}
                  onBlur={() =>
                    setHexDraft(normalizeCategoryColor(pendingVisual.color))
                  }
                  aria-label="Category color hex value"
                  className="min-h-11 min-w-0 rounded-[13px] border border-border bg-surface-secondary px-3 text-sm font-bold uppercase text-text-primary outline-none focus:border-active"
                />
              </div>
            </section>
          </div>

          <SheetFooter className="border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
            <Button type="button" size="lg" onClick={applyAppearance}>
              Apply appearance
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
