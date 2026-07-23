import type { JalvoroIconDefinition } from "../types";

export const mailIconDefinition = {
  name: "mail", label: "Mail", category: "communication", keywords: ["email", "message"], objects: 1,
  body: [
    { kind: "rect", x: 3.8, y: 5.5, width: 16.4, height: 13, rx: 2 },
    { kind: "path", d: "m5 7 7 5.5L19 7" },
  ],
  accent: { x: 8.8, y: 15.6, width: 3.2, height: 0.42, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const chatIconDefinition = {
  name: "chat", label: "Chat", category: "communication", keywords: ["message", "conversation"], objects: 1,
  body: [
    { kind: "path", d: "M4 5.5h16v11.2H9l-5 3.3V5.5Z" },
    { kind: "line", x1: 8, y1: 10, x2: 16, y2: 10, strokeScale: 0.8 },
    { kind: "line", x1: 8, y1: 13, x2: 13, y2: 13, strokeScale: 0.8 },
  ],
  accent: { x: 14.3, y: 13, width: 2.4, height: 0.38, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const phoneIconDefinition = {
  name: "phone", label: "Phone", category: "communication", keywords: ["call", "contact"], objects: 1,
  body: [{ kind: "path", d: "M7.1 4.2 9.4 8l-1.8 2c1.1 2.4 2.9 4.3 5.4 5.4l2-1.8 3.8 2.3c.6.4.9 1.1.6 1.8l-.6 1.5c-.3.7-1 1.1-1.8 1-6.9-.8-12.4-6.3-13.2-13.2-.1-.8.3-1.5 1-1.8l1.5-.6c.7-.3 1.4 0 1.8.6Z" }],
  accent: { x: 10.6, y: 12, width: 2.8, height: 0.42, rotation: 45 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const sendIconDefinition = {
  name: "send", label: "Send", category: "communication", keywords: ["paper-plane", "submit"], objects: 1,
  body: [
    { kind: "path", d: "m3.8 5.2 16.4 6.8-16.4 6.8 2.7-5.1L15 12l-8.5-1.7-2.7-5.1Z" },
    { kind: "line", x1: 6.5, y1: 13.7, x2: 6.5, y2: 18.8, strokeScale: 0.8 },
  ],
  accent: { x: 9, y: 11.8, width: 2.6, height: 0.42, rotation: 0 }, defaultAccent: "zigzag",
} as const satisfies JalvoroIconDefinition;

export const globeIconDefinition = {
  name: "globe", label: "Globe", category: "communication", keywords: ["world", "language", "global"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "M4 12h16M12 4c2.2 2.1 3.3 4.8 3.3 8S14.2 17.9 12 20M12 4C9.8 6.1 8.7 8.8 8.7 12s1.1 5.9 3.3 8" },
  ],
  accent: { x: 10.6, y: 11.9, width: 2.8, height: 0.42, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const COMMUNICATION_ICON_DEFINITIONS = [mailIconDefinition, chatIconDefinition, phoneIconDefinition, sendIconDefinition, globeIconDefinition] as const;
