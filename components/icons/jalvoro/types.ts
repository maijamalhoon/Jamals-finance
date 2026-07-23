import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

export const JALVORO_ICON_ACCENTS = ["none", "wave", "zigzag", "subtle"] as const;
export type JalvoroIconAccent = (typeof JALVORO_ICON_ACCENTS)[number];

export const JALVORO_ICON_CONTEXTS = ["compact", "content", "heading", "hero"] as const;
export type JalvoroIconContext = (typeof JALVORO_ICON_CONTEXTS)[number];

export type JalvoroIconCategory = "navigation" | "actions" | "finance" | "objects" | "identity" | "communication" | "interface" | "status";

export type JalvoroIconNode =
  | { kind: "path"; d: string; strokeScale?: number; filled?: boolean; opacity?: number }
  | { kind: "circle"; cx: number; cy: number; r: number; strokeScale?: number; filled?: boolean; opacity?: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; strokeScale?: number; filled?: boolean; opacity?: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; strokeScale?: number; filled?: boolean; opacity?: number }
  | { kind: "polyline"; points: string; strokeScale?: number; filled?: boolean; opacity?: number };

export type JalvoroAccentPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type JalvoroIconDefinition = {
  name: string;
  label: string;
  category: JalvoroIconCategory;
  keywords: readonly string[];
  aliases?: readonly string[];
  objects: 1 | 2;
  body: readonly JalvoroIconNode[];
  accent?: JalvoroAccentPlacement;
  defaultAccent: JalvoroIconAccent;
};

export type JalvoroIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number | string;
  strokeWidth?: number;
  context?: JalvoroIconContext;
  accent?: JalvoroIconAccent;
  title?: string;
};

export type JalvoroIconComponent = ForwardRefExoticComponent<
  JalvoroIconProps & RefAttributes<SVGSVGElement>
>;
