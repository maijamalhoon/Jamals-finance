import type { JalvoroIconDefinition } from "../types";

export const fileIconDefinition = {
  name: "file", label: "File", category: "objects", keywords: ["document", "page"], objects: 1,
  body: [
    { kind: "path", d: "M6 3.8h8.3L18 7.5v12.7H6V3.8Z" },
    { kind: "path", d: "M14.3 3.8v3.7H18" },
  ],
  accent: { x: 9, y: 12.5, width: 5, height: 0.48, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const folderIconDefinition = {
  name: "folder", label: "Folder", category: "objects", keywords: ["directory", "files"], objects: 1,
  body: [{ kind: "path", d: "M3.8 7.2c0-1 .8-1.8 1.8-1.8h4l1.8 2h7c1 0 1.8.8 1.8 1.8v8.5c0 1-.8 1.8-1.8 1.8H5.6c-1 0-1.8-.8-1.8-1.8V7.2Z" }],
  accent: { x: 8, y: 13.6, width: 5.2, height: 0.5, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const bellIconDefinition = {
  name: "bell", label: "Bell", category: "objects", keywords: ["notification", "alert"], objects: 1,
  body: [
    { kind: "path", d: "M6.5 10.5c0-3.2 2.2-5.7 5.5-5.7s5.5 2.5 5.5 5.7v4.1l1.5 2.1H5l1.5-2.1v-4.1Z" },
    { kind: "path", d: "M9.8 19c.5.8 1.2 1.2 2.2 1.2s1.7-.4 2.2-1.2" },
  ],
  accent: { x: 10.1, y: 9.2, width: 3.4, height: 0.48, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const clockIconDefinition = {
  name: "clock", label: "Clock", category: "objects", keywords: ["time", "history"], objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "path", d: "M12 7.5v4.8l3.2 1.8" },
  ],
  accent: { x: 7.2, y: 15.9, width: 2.8, height: 0.42, rotation: 12 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const calendarIconDefinition = {
  name: "calendar", label: "Calendar", category: "objects", keywords: ["date", "schedule"], objects: 1,
  body: [
    { kind: "rect", x: 4, y: 5.5, width: 16, height: 14.5, rx: 2 },
    { kind: "line", x1: 8, y1: 3.8, x2: 8, y2: 7.2 },
    { kind: "line", x1: 16, y1: 3.8, x2: 16, y2: 7.2 },
    { kind: "line", x1: 4, y1: 9, x2: 20, y2: 9 },
    { kind: "line", x1: 8, y1: 12.2, x2: 10.2, y2: 12.2, strokeScale: 0.8 },
    { kind: "line", x1: 13.8, y1: 12.2, x2: 16, y2: 12.2, strokeScale: 0.8 },
    { kind: "line", x1: 8, y1: 16, x2: 10.2, y2: 16, strokeScale: 0.8 },
  ],
  accent: { x: 13.7, y: 16, width: 2.4, height: 0.42, rotation: 0 }, defaultAccent: "zigzag",
} as const satisfies JalvoroIconDefinition;

export const tagIconDefinition = {
  name: "tag", label: "Tag", category: "objects", keywords: ["label", "category"], objects: 1,
  body: [
    { kind: "path", d: "M4.2 5.2h7.6l8 8-6.8 6.8-8.8-8.8v-6Z" },
    { kind: "circle", cx: 8.3, cy: 9.1, r: 1.1 },
  ],
  accent: { x: 11.7, y: 14.5, width: 3.4, height: 0.45, rotation: 45 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const linkIconDefinition = {
  name: "link", label: "Link", category: "objects", keywords: ["url", "connection"], objects: 2,
  body: [
    { kind: "path", d: "M9.5 14.5 8 16c-1.6 1.6-4.1 1.6-5.7 0s-1.6-4.1 0-5.7l2.4-2.4c1.6-1.6 4.1-1.6 5.7 0" },
    { kind: "path", d: "m14.5 9.5 1.5-1.5c1.6-1.6 4.1-1.6 5.7 0s1.6 4.1 0 5.7l-2.4 2.4c-1.6 1.6-4.1 1.6-5.7 0" },
    { kind: "line", x1: 8.5, y1: 15.5, x2: 15.5, y2: 8.5 },
  ],
  accent: { x: 10.7, y: 11.8, width: 2.5, height: 0.42, rotation: -45 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const imageIconDefinition = {
  name: "image", label: "Image", category: "objects", keywords: ["picture", "media"], objects: 1,
  body: [
    { kind: "rect", x: 3.8, y: 4.5, width: 16.4, height: 15, rx: 2 },
    { kind: "circle", cx: 8.3, cy: 9, r: 1.5 },
    { kind: "path", d: "m5.5 17 4.2-4.3 2.8 2.7 2.2-2.1 3.8 3.7" },
  ],
  accent: { x: 13.7, y: 8.4, width: 3, height: 0.42, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const cameraIconDefinition = {
  name: "camera", label: "Camera", category: "objects", keywords: ["photo", "capture"], objects: 1,
  body: [
    { kind: "path", d: "M4.5 8.2h3l1.3-2h6.4l1.3 2h3c.8 0 1.5.7 1.5 1.5v8.1c0 .8-.7 1.5-1.5 1.5h-15c-.8 0-1.5-.7-1.5-1.5V9.7c0-.8.7-1.5 1.5-1.5Z" },
    { kind: "circle", cx: 12, cy: 13.4, r: 3.5 },
  ],
  accent: { x: 10.6, y: 13.4, width: 2.8, height: 0.42, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const lockIconDefinition = {
  name: "lock", label: "Lock", category: "objects", keywords: ["secure", "privacy"], objects: 1,
  body: [
    { kind: "rect", x: 5.5, y: 10, width: 13, height: 10, rx: 2 },
    { kind: "path", d: "M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" },
    { kind: "circle", cx: 12, cy: 14.5, r: 1, filled: true },
    { kind: "line", x1: 12, y1: 15.5, x2: 12, y2: 17.4, strokeScale: 0.75 },
  ],
  accent: { x: 8, y: 13, width: 2.2, height: 0.38, rotation: 0 }, defaultAccent: "subtle",
} as const satisfies JalvoroIconDefinition;

export const keyIconDefinition = {
  name: "key", label: "Key", category: "objects", keywords: ["access", "credential"], objects: 1,
  body: [
    { kind: "circle", cx: 8, cy: 12, r: 3.8 },
    { kind: "path", d: "M11.8 12H20m-2.6 0v2m-2.6-2v2" },
  ],
  accent: { x: 5.9, y: 11.9, width: 2.3, height: 0.4, rotation: 0 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const pencilIconDefinition = {
  name: "pencil", label: "Pencil", category: "objects", keywords: ["write", "draw"], objects: 1,
  body: [
    { kind: "path", d: "M5.5 18.5 6.4 14.7 15.3 5.8c.6-.6 1.5-.6 2.1 0l.8.8c.6.6.6 1.5 0 2.1l-8.9 8.9-3.8.9Z" },
    { kind: "path", d: "m14.3 6.8 3 3" },
    { kind: "path", d: "M6.4 14.7 9.3 17.6" },
    { kind: "path", d: "m5.5 18.5 1.9-.5-1.4-1.4-.5 1.9Z", filled: true },
  ],
  accent: { x: 10.6, y: 15.7, width: 5.2, height: 0.55, rotation: -45 }, defaultAccent: "wave",
} as const satisfies JalvoroIconDefinition;

export const OBJECTS_ICON_DEFINITIONS = [
  fileIconDefinition, folderIconDefinition, bellIconDefinition, clockIconDefinition,
  calendarIconDefinition, tagIconDefinition, linkIconDefinition, imageIconDefinition,
  cameraIconDefinition, lockIconDefinition, keyIconDefinition, pencilIconDefinition,
] as const;
