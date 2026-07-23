"use client";

import type {
  ChangeEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Search, X } from "lucide-react";

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

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = normalizeCategoryColor(hex).replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function hexToHsv(hex: string): HsvColor {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  return {
    h: Math.round(hue),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function hsvToHex({ h, s, v }: HsvColor) {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return rgbToHex(
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255,
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
  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(visual.color));
  const [hexDraft, setHexDraft] = useState(() =>
    normalizeCategoryColor(visual.color),
  );
  const colorPlaneRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const iconOptions = useMemo(
    () => getCategoryIconOptions(type, iconQuery),
    [iconQuery, type],
  );

  function togglePicker() {
    const nextOpen = !pickerOpen;
    if (nextOpen && isValidCategoryColor(visual.color)) {
      const normalized = normalizeCategoryColor(visual.color);
      setHsv(hexToHsv(normalized));
      setHexDraft(normalized);
      setIconQuery("");
      nameInputRef.current?.blur();
    }
    setPickerOpen(nextOpen);
  }

  function updateColor(color: string) {
    if (!isValidCategoryColor(color)) return;
    const normalized = normalizeCategoryColor(color);
    setHsv(hexToHsv(normalized));
    setHexDraft(normalized);
    onVisualChange({
      ...visual,
      color: normalized,
    });
  }

  function updateHsv(next: HsvColor) {
    const normalized = {
      h: clamp(next.h, 0, 359),
      s: clamp(next.s, 0, 100),
      v: clamp(next.v, 0, 100),
    };
    const color = hsvToHex(normalized);
    setHsv(normalized);
    setHexDraft(color);
    onVisualChange({ ...visual, color });
  }

  function updateColorPlane(clientX: number, clientY: number) {
    const bounds = colorPlaneRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const saturation = ((clientX - bounds.left) / bounds.width) * 100;
    const value = 100 - ((clientY - bounds.top) / bounds.height) * 100;
    updateHsv({ ...hsv, s: saturation, v: value });
  }

  function handleColorPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateColorPlane(event.clientX, event.clientY);
  }

  function handleColorPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateColorPlane(event.clientX, event.clientY);
  }

  function handleColorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    const next = { ...hsv };

    if (event.key === "ArrowLeft") next.s -= step;
    else if (event.key === "ArrowRight") next.s += step;
    else if (event.key === "ArrowUp") next.v += step;
    else if (event.key === "ArrowDown") next.v -= step;
    else return;

    event.preventDefault();
    updateHsv(next);
  }

  function selectIcon(iconKey: NamedCategoryIconKey) {
    onVisualChange({ ...visual, iconKey });
  }

  function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.toUpperCase();
    setHexDraft(raw);
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    if (!isValidCategoryColor(candidate)) return;

    const normalized = normalizeCategoryColor(candidate);
    setHsv(hexToHsv(normalized));
    onVisualChange({ ...visual, color: normalized });
  }

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(visual.color);
    } catch {
      // The visible field remains selectable when clipboard access is blocked.
    }
  }

  return (
    <div className="min-w-0" data-category-visual-field="true">
      <div
        className={`flex min-h-12 min-w-0 items-center rounded-[14px] border bg-card px-2.5 transition-colors focus-within:border-active focus-within:ring-3 focus-within:ring-active/15 ${
          pickerOpen ? "border-active/55" : "border-border"
        }`}
      >
        <button
          type="button"
          onClick={togglePicker}
          disabled={disabled}
          aria-label="Choose category icon and color"
          aria-expanded={pickerOpen}
          className="finance-focus grid size-9 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
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
          ref={nameInputRef}
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

      {pickerOpen ? (
        <section
          aria-label="Category icon and color picker"
          className="mt-2 w-full min-w-0 overflow-hidden rounded-[18px] border border-border bg-card shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary">Icon and color</p>
              <p className="truncate text-[11px] text-text-secondary">
                Custom marker icons for {type} categories
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="finance-focus grid size-9 shrink-0 place-items-center rounded-[10px] text-text-secondary hover:bg-hover hover:text-text-primary"
              aria-label="Close icon picker"
            >
              <X size={17} />
            </button>
          </div>

          <div className="space-y-3 p-3 sm:p-4">
            <div
              className="grid grid-cols-5 gap-2 sm:grid-cols-10"
              aria-label="Quick category colors"
            >
              {QUICK_COLORS.map((color) => {
                const selected = normalizeCategoryColor(visual.color) === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateColor(color)}
                    className="finance-focus grid aspect-square min-h-9 place-items-center rounded-full border border-black/5 transition-transform hover:scale-105 sm:min-h-8"
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                    aria-pressed={selected}
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

            <button
              type="button"
              onClick={() => setCustomColorOpen((current) => !current)}
              className="finance-focus flex min-h-10 w-full items-center justify-between rounded-[11px] border border-border bg-surface-secondary px-3 text-left text-xs font-bold text-text-primary hover:bg-hover"
              aria-expanded={customColorOpen}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-4 rounded-full border border-border"
                  style={{ backgroundColor: visual.color }}
                />
                Custom color
              </span>
              <ChevronDown
                size={15}
                className={`transition-transform ${customColorOpen ? "rotate-180" : ""}`}
              />
            </button>

            {customColorOpen ? (
              <div className="grid gap-3 rounded-[13px] border border-border bg-surface-secondary p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.72fr)]">
                <div
                  ref={colorPlaneRef}
                  role="slider"
                  aria-label="Color saturation and brightness"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(hsv.s)}
                  aria-valuetext={`${Math.round(hsv.s)}% saturation, ${Math.round(hsv.v)}% brightness`}
                  tabIndex={0}
                  onPointerDown={handleColorPointerDown}
                  onPointerMove={handleColorPointerMove}
                  onKeyDown={handleColorKeyDown}
                  className="relative h-32 w-full touch-none cursor-crosshair overflow-hidden rounded-[11px] border border-border sm:h-36"
                  style={{
                    backgroundColor: `hsl(${hsv.h} 100% 50%)`,
                    backgroundImage:
                      "linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={359}
                    value={hsv.h}
                    onChange={(event) =>
                      updateHsv({ ...hsv, h: Number(event.target.value) })
                    }
                    aria-label="Color hue"
                    className="h-2 w-full cursor-pointer appearance-none rounded-full"
                    style={{
                      background:
                        "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                    }}
                  />
                  <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
                    <span className="text-[11px] font-semibold text-text-secondary">
                      Hex
                    </span>
                    <input
                      value={hexDraft}
                      onChange={handleHexChange}
                      onBlur={() =>
                        setHexDraft(normalizeCategoryColor(visual.color))
                      }
                      aria-label="Hex color"
                      className="min-h-9 min-w-0 rounded-[9px] border border-border bg-card px-2 text-xs font-semibold uppercase text-text-primary outline-none focus:border-active"
                    />
                    <button
                      type="button"
                      onClick={() => void copyHex()}
                      className="finance-focus grid size-9 place-items-center rounded-[9px] border border-border bg-card text-text-secondary hover:bg-hover hover:text-text-primary"
                      aria-label="Copy hex color"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="relative">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                value={iconQuery}
                onChange={(event) => setIconQuery(event.target.value)}
                placeholder={`Search ${type} icons`}
                aria-label={`Search ${type} category icons`}
                className="min-h-11 w-full rounded-[11px] border border-border bg-surface-secondary pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-active"
              />
            </div>

            <div className="max-h-[min(42dvh,20rem)] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
              <div
                className="grid grid-cols-5 gap-2 min-[390px]:grid-cols-6 sm:grid-cols-8"
                role="listbox"
                aria-label="Category marker icons"
              >
                {iconOptions.map((entry) => {
                  const selected = visual.iconKey === entry.iconKey;
                  return (
                    <button
                      key={`${entry.iconKey}-${entry.label}`}
                      type="button"
                      onClick={() => selectIcon(entry.iconKey)}
                      aria-label={entry.label}
                      aria-selected={selected}
                      role="option"
                      className={`finance-focus group grid min-h-16 min-w-0 place-items-center gap-1 rounded-[12px] border px-1.5 py-2 text-center transition-colors ${
                        selected
                          ? "border-active bg-active/10 ring-1 ring-inset ring-active/40"
                          : "border-transparent bg-surface-secondary hover:border-border hover:bg-hover"
                      }`}
                    >
                      <CategoryVisualIcon
                        color={visual.color}
                        iconKey={entry.iconKey}
                        label={entry.label}
                        size="xs"
                      />
                      <span className="w-full truncate text-[9px] font-semibold leading-3 text-text-secondary group-hover:text-text-primary sm:text-[10px]">
                        {entry.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {iconOptions.length === 0 ? (
                <p className="py-7 text-center text-xs text-text-secondary">
                  No matching custom icon found.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border bg-surface-secondary p-2.5 sm:p-3">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="finance-focus min-h-11 w-full rounded-[11px] bg-card px-3 text-center text-sm font-bold text-text-primary shadow-[var(--shadow-xs)] hover:bg-hover"
            >
              Done
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
