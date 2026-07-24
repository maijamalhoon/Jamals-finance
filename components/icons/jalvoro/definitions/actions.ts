import type { JalvoroIconDefinition } from "../types";

export const addIconDefinition = {
  name: "add",
  label: "Add",
  category: "actions",
  keywords: ["plus", "new", "create"],
  objects: 1,
  body: [
    { kind: "circle", cx: 12, cy: 12, r: 8 },
    { kind: "line", x1: 12, y1: 8, x2: 12, y2: 16 },
    { kind: "line", x1: 8, y1: 12, x2: 16, y2: 12 },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const editIconDefinition = {
  name: "edit",
  label: "Edit",
  category: "actions",
  keywords: ["pencil", "modify", "write"],
  objects: 1,
  body: [
    { kind: "path", d: "M5.5 18.5 6.4 14.7 15.3 5.8c.6-.6 1.5-.6 2.1 0l.8.8c.6.6.6 1.5 0 2.1l-8.9 8.9-3.8.9Z" },
    { kind: "path", d: "m14.3 6.8 3 3" },
    { kind: "path", d: "M6.4 14.7 9.3 17.6" },
    { kind: "path", d: "m5.5 18.5 1.9-.5-1.4-1.4-.5 1.9Z", filled: true },
  ],
  accent: { x: 10.6, y: 15.7, width: 5.2, height: 0.55, rotation: -45 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const deleteIconDefinition = {
  name: "delete",
  label: "Delete",
  category: "actions",
  keywords: ["trash", "remove", "bin"],
  objects: 1,
  body: [
    { kind: "path", d: "M5.5 7.2h13" },
    { kind: "path", d: "M9 7.2V5.6c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.6" },
    { kind: "path", d: "M7.2 7.2 8 19.1c.1.8.7 1.4 1.5 1.4h5c.8 0 1.5-.6 1.5-1.4l.8-11.9" },
    { kind: "line", x1: 10.3, y1: 10.5, x2: 10.7, y2: 17.2, strokeScale: 0.85 },
    { kind: "line", x1: 13.7, y1: 10.5, x2: 13.3, y2: 17.2, strokeScale: 0.85 },
  ],
  accent: { x: 10.7, y: 13.7, width: 2.6, height: 0.55, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const copyIconDefinition = {
  name: "copy",
  label: "Copy",
  category: "actions",
  keywords: ["duplicate", "clone", "documents"],
  objects: 2,
  body: [
    { kind: "rect", x: 8, y: 7, width: 11, height: 12, rx: 2 },
    { kind: "path", d: "M15.5 7V5.8c0-.8-.6-1.4-1.4-1.4H6.4C5.6 4.4 5 5 5 5.8v8.4c0 .8.6 1.4 1.4 1.4H8" },
  ],
  accent: { x: 11, y: 12.4, width: 4, height: 0.55, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const searchIconDefinition = {
  name: "search",
  label: "Search",
  category: "actions",
  keywords: ["find", "lookup", "magnifier"],
  objects: 1,
  body: [
    { kind: "circle", cx: 10.5, cy: 10.5, r: 6.3 },
    { kind: "path", d: "m15.2 15.2 4.3 4.3" },
  ],
  accent: { x: 7.9, y: 9.4, width: 3.1, height: 0.5, rotation: -8 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const filterIconDefinition = {
  name: "filter",
  label: "Filter",
  category: "actions",
  keywords: ["funnel", "refine"],
  objects: 1,
  body: [{ kind: "path", d: "M4.5 5h15l-5.8 6.7v5.2l-3.4 2.1v-7.3L4.5 5Z" }],
  accent: { x: 9.9, y: 8.4, width: 3.7, height: 0.5, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const sortIconDefinition = {
  name: "sort",
  label: "Sort",
  category: "actions",
  keywords: ["order", "arrange"],
  objects: 1,
  body: [
    { kind: "path", d: "M8 5v14m0 0-2.2-2.2M8 19l2.2-2.2" },
    { kind: "path", d: "M16 19V5m0 0-2.2 2.2M16 5l2.2 2.2" },
  ],
  accent: { x: 10.8, y: 11.8, width: 2.4, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const shareIconDefinition = {
  name: "share",
  label: "Share",
  category: "actions",
  keywords: ["send", "network"],
  objects: 1,
  body: [
    { kind: "circle", cx: 6, cy: 12, r: 2 },
    { kind: "circle", cx: 17.5, cy: 6, r: 2 },
    { kind: "circle", cx: 17.5, cy: 18, r: 2 },
    { kind: "line", x1: 7.8, y1: 11.1, x2: 15.7, y2: 6.9 },
    { kind: "line", x1: 7.8, y1: 12.9, x2: 15.7, y2: 17.1 },
  ],
  accent: { x: 10.8, y: 11.9, width: 2.5, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const exportIconDefinition = {
  name: "export",
  label: "Export",
  category: "actions",
  keywords: ["out", "file", "send"],
  objects: 2,
  body: [
    { kind: "path", d: "M5.5 10.5v8h13v-8" },
    { kind: "path", d: "M12 4v10m0-10-3 3m3-3 3 3" },
  ],
  accent: { x: 8, y: 17, width: 3, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const importIconDefinition = {
  name: "import",
  label: "Import",
  category: "actions",
  keywords: ["in", "file", "receive"],
  objects: 2,
  body: [
    { kind: "path", d: "M5.5 13.5v5h13v-5" },
    { kind: "path", d: "M12 4v10m0 0-3-3m3 3 3-3" },
  ],
  accent: { x: 8, y: 17, width: 3, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const downloadIconDefinition = {
  name: "download",
  label: "Download",
  category: "actions",
  keywords: ["save", "arrow-down"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 4v10m0 0-3-3m3 3 3-3" },
    { kind: "path", d: "M5 18.5h14" },
  ],
  accent: { x: 9.4, y: 17, width: 2.8, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const uploadIconDefinition = {
  name: "upload",
  label: "Upload",
  category: "actions",
  keywords: ["send", "arrow-up"],
  objects: 1,
  body: [
    { kind: "path", d: "M12 15V5m0 0-3 3m3-3 3 3" },
    { kind: "path", d: "M5 19h14" },
  ],
  accent: { x: 9.4, y: 17.5, width: 2.8, height: 0.42, rotation: 0 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const refreshIconDefinition = {
  name: "refresh",
  label: "Refresh",
  category: "actions",
  keywords: ["reload", "sync"],
  objects: 1,
  body: [
    { kind: "path", d: "M18.5 8.2A7 7 0 1 0 19 14" },
    { kind: "path", d: "M18.5 4.5v3.7h-3.7" },
  ],
  accent: { x: 6.8, y: 15.9, width: 2.6, height: 0.42, rotation: 12 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const checkIconDefinition = {
  name: "check",
  label: "Check",
  category: "actions",
  keywords: ["done", "confirm"],
  objects: 1,
  body: [{ kind: "path", d: "m5.5 12.5 4.2 4.2 8.8-9.2" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const closeIconDefinition = {
  name: "close",
  label: "Close",
  category: "actions",
  keywords: ["x", "cancel"],
  objects: 1,
  body: [{ kind: "path", d: "M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" }],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const moreIconDefinition = {
  name: "more",
  label: "More",
  category: "actions",
  keywords: ["ellipsis", "options"],
  objects: 1,
  body: [
    { kind: "circle", cx: 6.5, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 12, cy: 12, r: 1, filled: true },
    { kind: "circle", cx: 17.5, cy: 12, r: 1, filled: true },
  ],
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const undoIconDefinition = {
  name: "undo",
  label: "Undo",
  category: "actions",
  keywords: ["back", "revert"],
  objects: 1,
  body: [{ kind: "path", d: "M9 8H5V4m0 4c1.7-2 4.1-3.2 6.8-3.2 4.5 0 8.2 3.5 8.2 7.8s-3.7 7.8-8.2 7.8c-2.4 0-4.6-1-6.1-2.5" }],
  accent: { x: 13.2, y: 17.3, width: 2.6, height: 0.42, rotation: -8 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const redoIconDefinition = {
  name: "redo",
  label: "Redo",
  category: "actions",
  keywords: ["forward", "repeat"],
  objects: 1,
  body: [{ kind: "path", d: "M15 8h4V4m0 4c-1.7-2-4.1-3.2-6.8-3.2C7.7 4.8 4 8.3 4 12.6s3.7 7.8 8.2 7.8c2.4 0 4.6-1 6.1-2.5" }],
  accent: { x: 8.2, y: 17.3, width: 2.6, height: 0.42, rotation: 8 },
  defaultAccent: "none",
} as const satisfies JalvoroIconDefinition;

export const ACTIONS_ICON_DEFINITIONS = [
  addIconDefinition,
  editIconDefinition,
  deleteIconDefinition,
  copyIconDefinition,
  searchIconDefinition,
  filterIconDefinition,
  sortIconDefinition,
  shareIconDefinition,
  exportIconDefinition,
  importIconDefinition,
  downloadIconDefinition,
  uploadIconDefinition,
  refreshIconDefinition,
  checkIconDefinition,
  closeIconDefinition,
  moreIconDefinition,
  undoIconDefinition,
  redoIconDefinition,
] as const;
