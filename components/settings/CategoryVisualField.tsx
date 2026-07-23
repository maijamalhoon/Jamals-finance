"use client";

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Search } from "lucide-react";

import { getCategoryEmojiOptions } from "@/lib/category-emoji-catalog";
import {
  CATEGORY_VISUAL_COLORS,
  CategoryVisualIcon,
  isValidCategoryColor,
  normalizeCategoryColor,
  type CategoryKind,
  type CategoryVisual,
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
  const [emojiQuery, setEmojiQuery] = useState("");
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(visual.color));
  const [hexDraft, setHexDraft] = useState(visual.color);
  const colorPlaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isValidCategoryColor(visual.color)) return;
    setHsv(hexToHsv(visual.color));
    setHexDraft(normalizeCategoryColor(visual.color));
  }, [visual.color]);

  useEffect(() => {
    setEmojiQuery("");
  }, [type]);

  const emojiOptions = useMemo(
    () => getCategoryEmojiOptions(type, emojiQuery),
    [emojiQuery, type],
  );

  function updateColor(color: string) {
    if (!isValidCategoryColor(color)) return;
    onVisualChange({
      ...visual,
      color: normalizeCategoryColor(color),
    });
  }

  function updateHsv(next: HsvColor) {
    const normalized = {
      h: clamp(next.h, 0, 359),
      s: clamp(next.s, 0, 100),
      v: clamp(next.v, 0, 100),
    };
    setHsv(normalized);
    updateColor(hsvToHex(normalized));
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

  function selectEmoji(emoji: string) {
    onVisualChange({ ...visual, iconKey: `emoji:${emoji}` });
  }

  function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.toUpperCase();
    setHexDraft(raw);
    const candidate = raw.startsWith("#") ? raw : `#${raw}`;
    if (isValidCategoryColor(candidate)) updateColor(candidate);
  }

  async function copyHex() {
    try {
      await navigator.clipboard.writeText(visual.color);
    } catch {
      // Clipboard access may be unavailable in restricted browsers. The value
      // remains visible and selectable in the field.
    }
  }

  return (
    <div className="min-w-0">
      <div
        className={`flex min-h-11 min-w-0 items-center rounded-[12px] border bg-card px-2 transition-colors focus-within:border-active focus-within:ring-3 focus-within:ring-active/15 ${
          pickerOpen ? "border-active/55" : "border-border"
        }`}
      >
        <button
          type="button"
          onClick={() => setPickerOpen((current) => !current)}
          disabled={disabled}
          aria-label="Choose category emoji and color"
          aria-expanded={pickerOpen}
          className="finance-focus grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CategoryVisualIcon
            color={visual.color}
            iconKey={visual.iconKey}
            label={name || `New ${type}`}
            size="xs"
          />
        </button>
        <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
        <input
          id={id}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-label={ariaLabel}
          className="min-h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {pickerOpen ? (
        <div className="mt-2 w-full max-w-[19rem] overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--shadow-lg)]">
          <div className="space-y-3 p-3">
            <div className="flex flex-wrap gap-2" aria-label="Quick category colors">
              {QUICK_COLORS.map((color) => {
                const selected = normalizeCategoryColor(visual.color) === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateColor(color)}
                    className="finance-focus grid size-7 place-items-center rounded-full border border-black/5 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                    aria-pressed={selected}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={3} className="text-white drop-shadow" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCustomColorOpen((current) => !current)}
              className="finance-focus flex w-full items-center justify-between rounded-[10px] px-1 py-1 text-left text-xs font-bold text-text-primary hover:bg-hover"
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
              <div className="space-y-2.5">
                <div
                  ref={colorPlaneRef}
                  role="slider"
                  aria-label="Color saturation and brightness"
                  aria-valuetext={`${Math.round(hsv.s)}% saturation, ${Math.round(hsv.v)}% brightness`}
                  tabIndex={0}
                  onPointerDown={handleColorPointerDown}
                  onPointerMove={handleColorPointerMove}
                  className="relative h-32 w-full touch-none cursor-crosshair overflow-hidden rounded-[10px] border border-border"
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
                <div className="grid grid-cols-[3rem_minmax(0,1fr)_2.25rem] items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-secondary">Hex</span>
                  <input
                    value={hexDraft}
                    onChange={handleHexChange}
                    onBlur={() => setHexDraft(normalizeCategoryColor(visual.color))}
                    aria-label="Hex color"
                    className="min-h-8 rounded-[8px] border border-border bg-surface-secondary px-2 text-xs font-semibold uppercase text-text-primary outline-none focus:border-active"
                  />
                  <button
                    type="button"
                    onClick={() => void copyHex()}
                    className="finance-focus grid size-8 place-items-center rounded-[8px] border border-border text-text-secondary hover:bg-hover hover:text-text-primary"
                    aria-label="Copy hex color"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="relative">
              <Search
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                value={emojiQuery}
                onChange={(event) => setEmojiQuery(event.target.value)}
                placeholder={`Search ${type} emojis`}
                aria-label={`Search ${type} category emojis`}
                className="min-h-9 w-full rounded-[9px] border border-border bg-surface-secondary pl-8 pr-2 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-active"
              />
            </div>

            <div className="max-h-52 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
              <div className="grid grid-cols-7 gap-1" role="listbox" aria-label="Category emojis">
                {emojiOptions.map((entry) => {
                  const iconKey = `emoji:${entry.emoji}`;
                  const selected = visual.iconKey === iconKey;
                  return (
                    <button
                      key={`${entry.emoji}-${entry.label}`}
                      type="button"
                      onClick={() => selectEmoji(entry.emoji)}
                      title={entry.label}
                      aria-label={entry.label}
                      aria-selected={selected}
                      role="option"
                      className={`finance-focus grid aspect-square min-h-8 place-items-center rounded-[8px] text-lg transition-colors hover:bg-hover ${
                        selected
                          ? "bg-active/12 ring-1 ring-inset ring-active"
                          : "bg-transparent"
                      }`}
                    >
                      <span aria-hidden="true">{entry.emoji}</span>
                    </button>
                  );
                })}
              </div>
              {emojiOptions.length === 0 ? (
                <p className="py-5 text-center text-xs text-text-secondary">
                  No matching emoji found.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border bg-surface-secondary p-2">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="finance-focus w-full rounded-[9px] px-3 py-2 text-left text-xs font-bold text-text-primary hover:bg-hover"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
