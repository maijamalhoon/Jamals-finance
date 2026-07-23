import type { JalvoroIconDefinition } from "../types";

export const userIconDefinition = {
  name: "user", label: "User", category: "identity", keywords: ["person", "profile"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 8, r: 3.3 },
    { kind: "path", d: "M5.5 20c.3-4 2.8-6.5 6.5-6.5s6.2 2.5 6.5 6.5" },
  ],
  accent: { x: 10.3, y: 16.7, width: 3.4, height: 0.45, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const usersIconDefinition = {
  name: "users", label: "Users", category: "identity", keywords: ["people", "team"], objects: 2,
  body: [
    { kind: "circle", cx: 9, cy: 8.5, r: 3 },
    { kind: "path", d: "M3.8 19c.3-3.6 2.3-5.8 5.2-5.8s4.9 2.2 5.2 5.8" },
    { kind: "circle", cx: 16.2, cy: 9.2, r: 2.4, strokeScale: 0.9 },
    { kind: "path", d: "M14.2 14.2c2.9-.3 5.2 1.5 5.8 4.8", strokeScale: 0.9 },
  ],
  accent: { x: 6.8, y: 16.7, width: 2.8, height: 0.42, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const userPlusIconDefinition = {
  name: "user-plus", label: "User Plus", category: "identity", keywords: ["invite", "add-person"], objects: 2,
  body: [
    { kind: "circle", cx: 9, cy: 8.5, r: 3 },
    { kind: "path", d: "M3.8 19c.3-3.6 2.3-5.8 5.2-5.8s4.9 2.2 5.2 5.8" },
    { kind: "line", x1: 17, y1: 9, x2: 17, y2: 15 },
    { kind: "line", x1: 14, y1: 12, x2: 20, y2: 12 },
  ],
  accent: { x: 6.9, y: 16.7, width: 2.6, height: 0.42, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const IDENTITY_ICON_DEFINITIONS = [userIconDefinition, usersIconDefinition, userPlusIconDefinition] as const;
