export const FEATURE_COLOR_CSS = {
  income: "var(--income)",
  expense: "var(--expense)",
  transfer: "var(--transfer)",
  investment: "var(--investment)",
  goals: "var(--goals)",
  payables: "var(--payables)",
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  muted: "var(--text-muted)",
} as const;

// Persisted category colors use the light-palette values because CSS variables
// cannot be stored as portable database color values.
export const FEATURE_COLOR_HEX = {
  income: "#1F9D6A",
  expense: "#D96C63",
  transfer: "#2E7DD7",
  investment: "#7C5CE0",
  goals: "#0F9F8F",
  payables: "#C48A1C",
  primary: "#3559E0",
  secondary: "#0F766E",
  accent: "#4F46E5",
  muted: "#64748B",
} as const;

export const CATEGORY_COLOR_PALETTE = [
  FEATURE_COLOR_HEX.income,
  FEATURE_COLOR_HEX.expense,
  FEATURE_COLOR_HEX.primary,
  FEATURE_COLOR_HEX.payables,
  FEATURE_COLOR_HEX.investment,
  FEATURE_COLOR_HEX.transfer,
  FEATURE_COLOR_HEX.goals,
  FEATURE_COLOR_HEX.secondary,
  FEATURE_COLOR_HEX.accent,
  FEATURE_COLOR_HEX.muted,
] as const;

export const CATEGORY_FALLBACK_COLORS = {
  income: FEATURE_COLOR_HEX.income,
  expense: FEATURE_COLOR_HEX.expense,
} as const;

export const CHART_COLOR_PALETTE = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--goals)",
  "var(--payables)",
  "var(--secondary)",
  "var(--accent)",
  "var(--text-muted)",
] as const;

export const ACCOUNT_ACCENT_OPTIONS = [
  { value: "blue", label: "Primary", color: "var(--primary)" },
  { value: "green", label: "Income", color: "var(--income)" },
  { value: "orange", label: "Payables", color: "var(--payables)" },
  { value: "purple", label: "Investment", color: "var(--investment)" },
  { value: "cyan", label: "Goals", color: "var(--goals)" },
  { value: "rose", label: "Expense", color: "var(--expense)" },
  { value: "amber", label: "Warning", color: "var(--warning)" },
  { value: "slate", label: "Neutral", color: "var(--text-muted)" },
] as const;

export function getAccountAccentColor(value?: string | null) {
  return (
    ACCOUNT_ACCENT_OPTIONS.find((option) => option.value === value)?.color ??
    FEATURE_COLOR_CSS.primary
  );
}

export function getReadableTextColor(backgroundColor: string) {
  const normalized = backgroundColor.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return FEATURE_COLOR_HEX.muted;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance >= 150 ? "#0F172A" : "#F8FAFC";
}
