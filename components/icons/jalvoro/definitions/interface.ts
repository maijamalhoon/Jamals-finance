import type { JalvoroIconDefinition } from "../types";

export const menuIconDefinition = {
  name: "menu", label: "Menu", category: "interface", keywords: ["navigation", "hamburger"], objects: 1,
  body: [
    { kind: "line", x1: 5, y1: 7, x2: 19, y2: 7 },
    { kind: "line", x1: 5, y1: 12, x2: 15.5, y2: 12 },
    { kind: "line", x1: 5, y1: 17, x2: 19, y2: 17 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const gridIconDefinition = {
  name: "grid", label: "Grid", category: "interface", keywords: ["tiles", "apps"], objects: 1,
  body: [
    { kind: "rect", x: 4, y: 4, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 14, y: 4, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 4, y: 14, width: 6, height: 6, rx: 1.2 },
    { kind: "rect", x: 14, y: 14, width: 6, height: 6, rx: 1.2 },
  ],
  accent: { x: 5.7, y: 7, width: 2.6, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const listIconDefinition = {
  name: "list", label: "List", category: "interface", keywords: ["rows", "items"], objects: 1,
  body: [
    { kind: "circle", cx: 5.5, cy: 7, r: 1, filled: true },
    { kind: "circle", cx: 5.5, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 5.5, cy: 17, r: 1, filled: true },
    { kind: "line", x1: 9, y1: 7, x2: 19, y2: 7 },
    { kind: "line", x1: 9, y1: 12, x2: 19, y2: 12 },
    { kind: "line", x1: 9, y1: 17, x2: 19, y2: 17 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sidebarIconDefinition = {
  name: "sidebar", label: "Sidebar", category: "interface", keywords: ["layout", "panel"], objects: 1,
  body: [
    { kind: "rect", x: 3.8, y: 4, width: 16.4, height: 16, rx: 2 },
    { kind: "line", x1: 9, y1: 4, x2: 9, y2: 20 },
    { kind: "line", x1: 5.7, y1: 8, x2: 7.2, y2: 8, strokeScale: 0.8 },
    { kind: "line", x1: 5.7, y1: 12, x2: 7.2, y2: 12, strokeScale: 0.8 },
  ],
  accent: { x: 12, y: 7.4, width: 4.5, height: 0.42, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const eyeIconDefinition = {
  name: "eye", label: "Eye", category: "interface", keywords: ["view", "visibility"], objects: 1,
  body: [
    { kind: "path", d: "M3.8 12s3-5.2 8.2-5.2 8.2 5.2 8.2 5.2-3 5.2-8.2 5.2S3.8 12 3.8 12Z" },
    { kind: "circle", cx: 12, cy: 12, r: 2.4 },
  ],
  accent: { x: 10.7, y: 12, width: 2.6, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const eyeOffIconDefinition = {
  name: "eye-off", label: "Eye Off", category: "interface", keywords: ["hidden", "privacy"], objects: 1,
  body: [
    { kind: "path", d: "M3.8 12s3-5.2 8.2-5.2c2.1 0 3.9.8 5.3 1.8M20.2 12s-3 5.2-8.2 5.2c-2.1 0-3.9-.8-5.3-1.8" },
    { kind: "path", d: "M5 5 19 19" },
    { kind: "path", d: "M9.8 9.8a3.1 3.1 0 0 0 4.4 4.4" },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const chevronDownIconDefinition = {
  name: "chevron-down", label: "Chevron Down", category: "interface", keywords: ["expand", "down"], objects: 1,
  body: [{ kind: "path", d: "m6.5 9 5.5 5.5L17.5 9" }], defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const chevronRightIconDefinition = {
  name: "chevron-right", label: "Chevron Right", category: "interface", keywords: ["next", "right"], objects: 1,
  body: [{ kind: "path", d: "m9 6.5 5.5 5.5L9 17.5" }], defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const arrowLeftIconDefinition = {
  name: "arrow-left", label: "Arrow Left", category: "interface", keywords: ["back", "previous"], objects: 1,
  body: [{ kind: "path", d: "M19 12H5m0 0 4-4m-4 4 4 4" }], defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const arrowRightIconDefinition = {
  name: "arrow-right", label: "Arrow Right", category: "interface", keywords: ["forward", "next"], objects: 1,
  body: [{ kind: "path", d: "M5 12h14m0 0-4-4m4 4-4 4" }], defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const INTERFACE_ICON_DEFINITIONS = [
  menuIconDefinition, gridIconDefinition, listIconDefinition, sidebarIconDefinition,
  eyeIconDefinition, eyeOffIconDefinition, chevronDownIconDefinition, chevronRightIconDefinition,
  arrowLeftIconDefinition, arrowRightIconDefinition,
] as const;
