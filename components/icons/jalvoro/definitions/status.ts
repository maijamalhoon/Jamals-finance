import type { JalvoroIconDefinition } from "../types";

export const successIconDefinition = {
  name: "success", label: "Success", category: "status", keywords: ["ok", "complete"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "m8 12.2 2.6 2.6 5.4-5.6" },
  ],
  accent: { x: 7.6, y: 17, width: 2.8, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const warningIconDefinition = {
  name: "warning", label: "Warning", category: "status", keywords: ["alert", "caution"], objects: 1,
  body: [
    { kind: "path", d: "M12 4 21 20H3L12 4Z" },
    { kind: "line", x1: 12, y1: 9, x2: 12, y2: 14 },
    { kind: "circle", cx: 12, cy: 17, r: 1, filled: true },
  ],
  accent: { x: 9.3, y: 7.2, width: 2.8, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const infoIconDefinition = {
  name: "info", label: "Info", category: "status", keywords: ["information", "help"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "circle", cx: 12, cy: 8.2, r: 1, filled: true },
    { kind: "line", x1: 12, y1: 11.2, x2: 12, y2: 16.2 },
  ],
  accent: { x: 7.3, y: 16.8, width: 2.6, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const errorIconDefinition = {
  name: "error", label: "Error", category: "status", keywords: ["failure", "danger"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "M9 9 15 15M15 9 9 15" },
  ],
  accent: { x: 7.2, y: 17, width: 2.7, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const pendingIconDefinition = {
  name: "pending", label: "Pending", category: "status", keywords: ["waiting", "progress"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "M12 7.5v4.7l3.1 1.8" },
    { kind: "path", d: "M17.6 5.9 19 4.5" },
  ],
  accent: { x: 6.9, y: 15.8, width: 2.6, height: 0.38, rotation: 8 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sparkIconDefinition = {
  name: "spark", label: "Spark", category: "status", keywords: ["magic", "ai", "new"], objects: 1,
  body: [
    { kind: "path", d: "M12 3.5 13.7 8.3 18.5 10 13.7 11.7 12 16.5 10.3 11.7 5.5 10 10.3 8.3 12 3.5Z" },
    { kind: "path", d: "M18.3 14.2 19 16l1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z", strokeScale: 0.8 },
  ],
  accent: { x: 8.6, y: 18.1, width: 2.5, height: 0.38, rotation: 0 }, defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const STATUS_ICON_DEFINITIONS = [
  successIconDefinition, warningIconDefinition, infoIconDefinition,
  errorIconDefinition, pendingIconDefinition, sparkIconDefinition,
] as const;
