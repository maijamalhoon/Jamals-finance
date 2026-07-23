import type { JalvoroIconDefinition } from "../types";

export const dashboardIconDefinition = {
  name: "dashboard",
  label: "Dashboard",
  category: "navigation",
  keywords: ["home", "overview", "gauge"],
  objects: 1,
  body: [
    { kind: "path", d: "M4.5 15.5a7.5 7.5 0 1 1 15 0" },
    { kind: "path", d: "M7.2 15.5a4.8 4.8 0 0 1 9.6 0", strokeScale: 0.9 },
    { kind: "line", x1: 12, y1: 15.5, x2: 15.2, y2: 11.6 },
    { kind: "circle", cx: 12, cy: 15.5, r: 0.75, filled: true },
    { kind: "line", x1: 5.4, y1: 18.5, x2: 18.6, y2: 18.5, strokeScale: 0.9 },
  ],
  accent: { x: 8.1, y: 9.2, width: 3.2, height: 0.55, rotation: -8 },
  defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const transactionsIconDefinition = {
  name: "transactions",
  label: "Transactions",
  category: "navigation",
  keywords: ["receipt", "history", "movement"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h12v16.4l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.8Z" },
    { kind: "line", x1: 9, y1: 8, x2: 15, y2: 8, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 11, x2: 15, y2: 11, strokeScale: 0.85 },
    { kind: "path", d: "M9 15h5.2m-1.5-1.5 1.5 1.5-1.5 1.5", strokeScale: 0.9 },
  ],
  accent: { x: 9, y: 13.1, width: 2.4, height: 0.45, rotation: 0 },
  defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const accountsIconDefinition = {
  name: "accounts",
  label: "Accounts",
  category: "navigation",
  keywords: ["bank", "institution", "vault"],
  objects: 1,
  body: [
    { kind: "path", d: "M3.8 9.2 12 4l8.2 5.2" },
    { kind: "line", x1: 5.2, y1: 10.2, x2: 18.8, y2: 10.2 },
    { kind: "line", x1: 6.2, y1: 10.2, x2: 6.2, y2: 17.2 },
    { kind: "line", x1: 10, y1: 10.2, x2: 10, y2: 17.2 },
    { kind: "line", x1: 14, y1: 10.2, x2: 14, y2: 17.2 },
    { kind: "line", x1: 17.8, y1: 10.2, x2: 17.8, y2: 17.2 },
    { kind: "line", x1: 4.5, y1: 18.2, x2: 19.5, y2: 18.2 },
    { kind: "line", x1: 3.8, y1: 20, x2: 20.2, y2: 20 },
  ],
  accent: { x: 10.4, y: 6.9, width: 3.2, height: 0.5, rotation: 0 },
  defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const incomeIconDefinition = {
  name: "income",
  label: "Income",
  category: "navigation",
  keywords: ["money-in", "earnings", "deposit"],
  objects: 2,
  body: [
    { kind: "circle", cx: 9, cy: 13, r: 5.2 },
    { kind: "path", d: "M8.9 9.7v6.6M11 10.6c-.5-.5-1.1-.8-2-.8-1.1 0-1.9.6-1.9 1.4 0 2.2 4.1 1.1 4.1 3.3 0 .9-.8 1.6-2.1 1.6-.9 0-1.7-.3-2.3-.9", strokeScale: 0.78 },
    { kind: "path", d: "M15 10.5 18.5 7m0 0v3.2m0-3.2h-3.2" },
  ],
  accent: { x: 14.4, y: 14.8, width: 2.6, height: 0.45, rotation: 18 },
  defaultAccent: "zigzag",
} as const satisfies JalvoroIconDefinition;

export const expensesIconDefinition = {
  name: "expenses",
  label: "Expenses",
  category: "navigation",
  keywords: ["money-out", "spending", "receipt"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h12v16.4l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.8Z" },
    { kind: "line", x1: 9, y1: 8, x2: 15, y2: 8, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 11, x2: 14, y2: 11, strokeScale: 0.85 },
    { kind: "path", d: "M15 13.5v4m0 0-1.5-1.5m1.5 1.5 1.5-1.5" },
  ],
  accent: { x: 8.8, y: 14.6, width: 2.2, height: 0.45, rotation: -4 },
  defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const goalsIconDefinition = {
  name: "goals",
  label: "Goals",
  category: "navigation",
  keywords: ["target", "objective", "milestone"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "circle", cx: 12, cy: 12, r: 4.7, strokeScale: 0.9 },
    { kind: "circle", cx: 12, cy: 12, r: 1.4, strokeScale: 0.8 },
    { kind: "path", d: "M15.2 8.8 19 5m0 0v3m0-3h-3" },
  ],
  accent: { x: 7.2, y: 15.7, width: 2.5, height: 0.45, rotation: 14 },
  defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const payablesIconDefinition = {
  name: "payables",
  label: "Payables",
  category: "navigation",
  keywords: ["due", "liability", "hand-coin"],
  objects: 2,
  body: [
    { kind: "path", d: "M4 15.2h3.2l2.2 2.2h5.7c1 0 1.9-.4 2.6-1.1l2.3-2.3c.5-.5.5-1.3 0-1.8-.5-.5-1.2-.5-1.7-.1l-2.5 2H12" },
    { kind: "path", d: "M7.2 15.2v-2.1c0-1.1.9-2 2-2h4.6c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5h-2.4" },
    { kind: "circle", cx: 14.8, cy: 6.8, r: 3.1 },
    { kind: "line", x1: 14.8, y1: 5.3, x2: 14.8, y2: 8.3, strokeScale: 0.75 },
  ],
  accent: { x: 13.4, y: 6.7, width: 2.5, height: 0.45, rotation: 0 },
  defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const investmentsIconDefinition = {
  name: "investments",
  label: "Investments",
  category: "navigation",
  keywords: ["portfolio", "growth", "briefcase"],
  objects: 1,
  body: [
    { kind: "rect", x: 4, y: 7.5, width: 16, height: 11.5, rx: 2 },
    { kind: "path", d: "M9 7.5V6.2c0-.7.6-1.2 1.2-1.2h3.6c.7 0 1.2.6 1.2 1.2v1.3" },
    { kind: "path", d: "M4 11.8c2.4 1.4 5.1 2.1 8 2.1s5.6-.7 8-2.1" },
    { kind: "line", x1: 12, y1: 12.6, x2: 12, y2: 15.1, strokeScale: 0.85 },
  ],
  accent: { x: 8.3, y: 16.6, width: 3.4, height: 0.5, rotation: -6 },
  defaultAccent: "zigzag",
} as const satisfies JalvoroIconDefinition;

export const analyticsIconDefinition = {
  name: "analytics",
  label: "Analytics",
  category: "navigation",
  keywords: ["chart", "data", "insights"],
  objects: 1,
  body: [
    { kind: "path", d: "M4.5 19.5h15" },
    { kind: "rect", x: 6, y: 12.5, width: 2.6, height: 5.7, rx: 0.7 },
    { kind: "rect", x: 10.7, y: 9.2, width: 2.6, height: 9, rx: 0.7 },
    { kind: "rect", x: 15.4, y: 5.8, width: 2.6, height: 12.4, rx: 0.7 },
    { kind: "path", d: "m5.5 9.7 4-3 3 1.7 5-4" },
  ],
  accent: { x: 6, y: 8.4, width: 2.3, height: 0.45, rotation: -15 },
  defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const aiInsightsIconDefinition = {
  name: "ai-insights",
  label: "AI Insights",
  category: "navigation",
  keywords: ["ai", "intelligence", "spark"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 3.8 13.3 7l3.4.5-2.6 2.2.7 3.4-2.8-1.8-2.8 1.8.7-3.4-2.6-2.2L10.7 7 12 3.8Z" },
    { kind: "circle", cx: 6.2, cy: 15.5, r: 2.2 },
    { kind: "circle", cx: 17.8, cy: 16.5, r: 2.2 },
    { kind: "path", d: "M8.2 14.6 10.1 12m3.8 1.1 1.9 2.1" },
  ],
  accent: { x: 10.7, y: 16.2, width: 2.8, height: 0.5, rotation: 0 },
  defaultAccent: "zigzag",
} as const satisfies JalvoroIconDefinition;

export const reportsIconDefinition = {
  name: "reports",
  label: "Reports",
  category: "navigation",
  keywords: ["document", "chart", "statement"],
  objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h8.3L18 7.5v12.7H6V3.8Z" },
    { kind: "path", d: "M14.3 3.8v3.7H18" },
    { kind: "line", x1: 9, y1: 11, x2: 15, y2: 11, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 14, x2: 12, y2: 14, strokeScale: 0.85 },
    { kind: "path", d: "M9 17.2h1.5v-1.4H12v1.4h1.5v-3H15v3" },
  ],
  accent: { x: 8.8, y: 8.3, width: 2.5, height: 0.45, rotation: 0 },
  defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const settingsIconDefinition = {
  name: "settings",
  label: "Settings",
  category: "navigation",
  keywords: ["preferences", "gear", "configuration"],
  objects: 1,
  body: [
    { kind: "path", d: "M10.8 3.5h2.4l.8 2.1 2.2.9 2.1-.9 1.7 1.7-.9 2.1.9 2.2 2.1.8v2.4l-2.1.8-.9 2.2.9 2.1-1.7 1.7-2.1-.9-2.2.9-.8 2.1h-2.4l-.8-2.1-2.2-.9-2.1.9-1.7-1.7.9-2.1-.9-2.2-2.1-.8v-2.4l2.1-.8.9-2.2-.9-2.1 1.7-1.7 2.1.9 2.2-.9.8-2.1Z" },
    { kind: "circle", cx: 12, cy: 11.8, r: 3 },
  ],
  accent: { x: 10.5, y: 11.8, width: 3, height: 0.48, rotation: 0 },
  defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const NAVIGATION_ICON_DEFINITIONS = [
  dashboardIconDefinition,
  transactionsIconDefinition,
  accountsIconDefinition,
  incomeIconDefinition,
  expensesIconDefinition,
  goalsIconDefinition,
  payablesIconDefinition,
  investmentsIconDefinition,
  analyticsIconDefinition,
  aiInsightsIconDefinition,
  reportsIconDefinition,
  settingsIconDefinition,
] as const;
