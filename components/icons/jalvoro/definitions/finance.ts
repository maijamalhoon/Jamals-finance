import type { JalvoroIconDefinition } from "../types";

export const walletIconDefinition = {
  name: "wallet", label: "Wallet", category: "finance", keywords: ["money", "balance", "purse"], objects: 1,
  body: [
    { kind: "path", d: "M4.5 7.2c0-1.1.9-2 2-2h10.8c1.2 0 2.2 1 2.2 2.2v10.4c0 1.1-.9 2-2 2h-11c-1.1 0-2-.9-2-2V7.2Z" },
    { kind: "path", d: "M4.5 8h11.8c1.8 0 3.2 1.4 3.2 3.2v3.3h-5c-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2h5" },
    { kind: "circle", cx: 15.2, cy: 12.3, r: 0.65, filled: true },
  ],
  accent: { x: 7.3, y: 15.9, width: 3.1, height: 0.5, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const bankIconDefinition = {
  name: "bank", label: "Bank", category: "finance", keywords: ["institution", "account"], objects: 1,
  body: [
    { kind: "path", d: "M3.8 9.2 12 4l8.2 5.2" },
    { kind: "line", x1: 5, y1: 10.2, x2: 19, y2: 10.2 },
    { kind: "line", x1: 6.3, y1: 10.2, x2: 6.3, y2: 17.2 },
    { kind: "line", x1: 10.1, y1: 10.2, x2: 10.1, y2: 17.2 },
    { kind: "line", x1: 13.9, y1: 10.2, x2: 13.9, y2: 17.2 },
    { kind: "line", x1: 17.7, y1: 10.2, x2: 17.7, y2: 17.2 },
    { kind: "line", x1: 4.5, y1: 18.2, x2: 19.5, y2: 18.2 },
    { kind: "line", x1: 3.8, y1: 20, x2: 20.2, y2: 20 },
  ],
  accent: { x: 10.3, y: 6.8, width: 3.4, height: 0.5, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const cardIconDefinition = {
  name: "card", label: "Card", category: "finance", keywords: ["credit", "debit", "payment"], objects: 1,
  body: [
    { kind: "rect", x: 3.8, y: 5.8, width: 16.4, height: 12.4, rx: 2 },
    { kind: "line", x1: 3.8, y1: 9.4, x2: 20.2, y2: 9.4 },
    { kind: "line", x1: 7, y1: 14.2, x2: 11.2, y2: 14.2, strokeScale: 0.85 },
  ],
  accent: { x: 14.8, y: 14.2, width: 2.7, height: 0.45, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const cashIconDefinition = {
  name: "cash", label: "Cash", category: "finance", keywords: ["banknote", "money"], objects: 1,
  body: [
    { kind: "rect", x: 3.8, y: 6.5, width: 16.4, height: 11, rx: 2 },
    { kind: "circle", cx: 12, cy: 12, r: 3 },
    { kind: "path", d: "M7 9.2c0 1.1-.9 2-2 2m14-2c-1.1 0-2-.9-2-2M7 14.8c0-1.1-.9-2-2-2m14 2c-1.1 0-2 .9-2 2" },
  ],
  accent: { x: 10.5, y: 11.9, width: 3, height: 0.45, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const coinIconDefinition = {
  name: "coin", label: "Coin", category: "finance", keywords: ["currency", "money"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "circle", cx: 12, cy: 12, r: 5.2, strokeScale: 0.85 },
    { kind: "path", d: "M12 8.4v7.2M14.2 9.5c-.5-.6-1.2-.9-2.2-.9-1.2 0-2 .6-2 1.5 0 2.2 4.2 1.1 4.2 3.4 0 1-.9 1.7-2.3 1.7-1 0-1.9-.4-2.5-1", strokeScale: 0.72 },
  ],
  accent: { x: 7.6, y: 16.1, width: 2.8, height: 0.45, rotation: 10 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const receiptIconDefinition = {
  name: "receipt", label: "Receipt", category: "finance", keywords: ["expense", "purchase"], objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h12v16.4l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V3.8Z" },
    { kind: "line", x1: 9, y1: 8, x2: 15, y2: 8, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 11, x2: 15, y2: 11, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 14, x2: 13, y2: 14, strokeScale: 0.85 },
  ],
  accent: { x: 9, y: 16.4, width: 2.7, height: 0.45, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const invoiceIconDefinition = {
  name: "invoice", label: "Invoice", category: "finance", keywords: ["bill", "document", "payment"], objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h8.3L18 7.5v12.7H6V3.8Z" },
    { kind: "path", d: "M14.3 3.8v3.7H18" },
    { kind: "line", x1: 9, y1: 11, x2: 15, y2: 11, strokeScale: 0.85 },
    { kind: "line", x1: 9, y1: 14, x2: 13, y2: 14, strokeScale: 0.85 },
    { kind: "path", d: "M12 16v2m1.2-1.6c-.3-.4-.7-.6-1.2-.6-.7 0-1.1.3-1.1.8 0 1.2 2.4.6 2.4 1.8 0 .5-.5.9-1.3.9-.5 0-1-.2-1.4-.6", strokeScale: 0.7 },
  ],
  accent: { x: 8.7, y: 8.4, width: 2.4, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const budgetIconDefinition = {
  name: "budget", label: "Budget", category: "finance", keywords: ["plan", "allocation", "pie"], objects: 2,
  body: [
    { kind: "circle", cx: 10, cy: 12, r: 6.5 },
    { kind: "path", d: "M10 5.5V12h6.5" },
    { kind: "path", d: "M14.6 7.4A6.5 6.5 0 0 1 18.5 12" },
    { kind: "rect", x: 17, y: 15.5, width: 3.2, height: 3.8, rx: 0.8 },
  ],
  accent: { x: 7.5, y: 14.5, width: 2.6, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const savingsIconDefinition = {
  name: "savings", label: "Savings", category: "finance", keywords: ["piggy", "reserve", "fund"], objects: 1,
  body: [
    { kind: "path", d: "M5.2 11.5c0-3 2.7-5.4 6.2-5.4 1.8 0 3.4.6 4.5 1.7l2.1-.7-.5 2.4c.7.8 1.1 1.8 1.1 3 0 2.4-1.7 4.4-4.2 5.1v2.2h-2.2v-1.8H9.1v1.8H6.9v-2.5c-1.1-.8-1.7-2-1.7-3.3H3.5v-2.5h1.7Z" },
    { kind: "circle", cx: 15.3, cy: 10.3, r: 0.55, filled: true },
    { kind: "line", x1: 9.4, y1: 7.6, x2: 13.4, y2: 7.6, strokeScale: 0.8 },
  ],
  accent: { x: 8.7, y: 12.7, width: 3, height: 0.45, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const trendUpIconDefinition = {
  name: "trend-up", label: "Trend Up", category: "finance", keywords: ["growth", "increase", "chart"], objects: 1,
  body: [
    { kind: "path", d: "M4.5 17.5 9 13l3 2.5 7.5-8" },
    { kind: "path", d: "M15.8 7.5h3.7v3.7" },
  ],
  accent: { x: 7.4, y: 15, width: 2.3, height: 0.42, rotation: -35 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const trendDownIconDefinition = {
  name: "trend-down", label: "Trend Down", category: "finance", keywords: ["decline", "decrease", "chart"], objects: 1,
  body: [
    { kind: "path", d: "M4.5 6.5 9 11l3-2.5 7.5 8" },
    { kind: "path", d: "M15.8 16.5h3.7v-3.7" },
  ],
  accent: { x: 7.4, y: 9, width: 2.3, height: 0.42, rotation: 35 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const transferIconDefinition = {
  name: "transfer", label: "Transfer", category: "finance", keywords: ["move", "send", "between"], objects: 1,
  body: [
    { kind: "path", d: "M5 8h12m0 0-2.5-2.5M17 8l-2.5 2.5" },
    { kind: "path", d: "M19 16H7m0 0 2.5 2.5M7 16l2.5-2.5" },
  ],
  accent: { x: 10.7, y: 12, width: 2.6, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const exchangeIconDefinition = {
  name: "exchange", label: "Exchange", category: "finance", keywords: ["currency", "swap", "convert"], objects: 2,
  body: [
    { kind: "circle", cx: 8, cy: 12, r: 4.2 },
    { kind: "circle", cx: 16, cy: 12, r: 4.2 },
    { kind: "path", d: "M10.8 8.8 13 6.8m0 0v2.4m0-2.4h-2.4M13.2 15.2 11 17.2m0 0v-2.4m0 2.4h2.4" },
  ],
  accent: { x: 10.8, y: 11.9, width: 2.4, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const calendarMoneyIconDefinition = {
  name: "calendar-money", label: "Calendar Money", category: "finance", keywords: ["schedule", "due", "payment"], objects: 2,
  body: [
    { kind: "rect", x: 4, y: 5.5, width: 16, height: 14.5, rx: 2 },
    { kind: "line", x1: 8, y1: 3.8, x2: 8, y2: 7.2 },
    { kind: "line", x1: 16, y1: 3.8, x2: 16, y2: 7.2 },
    { kind: "line", x1: 4, y1: 9, x2: 20, y2: 9 },
    { kind: "circle", cx: 12, cy: 14.2, r: 3.2 },
    { kind: "line", x1: 12, y1: 12.5, x2: 12, y2: 15.9, strokeScale: 0.75 },
  ],
  accent: { x: 7, y: 17.7, width: 2.8, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const shieldMoneyIconDefinition = {
  name: "shield-money", label: "Shield Money", category: "finance", keywords: ["protect", "security", "wealth"], objects: 2,
  body: [
    { kind: "path", d: "M12 3.5 19 6v5.2c0 4.2-2.8 7.7-7 9.3-4.2-1.6-7-5.1-7-9.3V6l7-2.5Z" },
    { kind: "circle", cx: 12, cy: 11.5, r: 3.1 },
    { kind: "line", x1: 12, y1: 9.8, x2: 12, y2: 13.2, strokeScale: 0.72 },
  ],
  accent: { x: 8.4, y: 16.1, width: 3.2, height: 0.45, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const taxIconDefinition = {
  name: "tax", label: "Tax", category: "finance", keywords: ["percentage", "fee", "rate"], objects: 1,
  body: [
    { kind: "circle", cx: 8, cy: 8, r: 2.2 },
    { kind: "circle", cx: 16, cy: 16, r: 2.2 },
    { kind: "line", x1: 7, y1: 17, x2: 17, y2: 7 },
    { kind: "rect", x: 4, y: 4, width: 16, height: 16, rx: 3 },
  ],
  accent: { x: 10.7, y: 11.8, width: 2.6, height: 0.42, rotation: -45 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const FINANCE_ICON_DEFINITIONS = [
  walletIconDefinition, bankIconDefinition, cardIconDefinition, cashIconDefinition,
  coinIconDefinition, receiptIconDefinition, invoiceIconDefinition, budgetIconDefinition,
  savingsIconDefinition, trendUpIconDefinition, trendDownIconDefinition, transferIconDefinition,
  exchangeIconDefinition, calendarMoneyIconDefinition, shieldMoneyIconDefinition, taxIconDefinition,
] as const;
