import type { JalvoroIconCategory } from "./types";

export type JalvoroIconName =
  | "dashboard"
  | "transactions"
  | "accounts"
  | "income"
  | "expenses"
  | "goals"
  | "payables"
  | "investments"
  | "analytics"
  | "ai-insights"
  | "reports"
  | "settings"
  | "add"
  | "edit"
  | "delete"
  | "copy"
  | "search"
  | "filter"
  | "sort"
  | "share"
  | "export"
  | "import"
  | "download"
  | "upload"
  | "refresh"
  | "check"
  | "close"
  | "more"
  | "undo"
  | "redo"
  | "wallet"
  | "bank"
  | "card"
  | "cash"
  | "coin"
  | "receipt"
  | "invoice"
  | "budget"
  | "savings"
  | "trend-up"
  | "trend-down"
  | "transfer"
  | "exchange"
  | "calendar-money"
  | "shield-money"
  | "tax"
  | "file"
  | "folder"
  | "bell"
  | "clock"
  | "calendar"
  | "tag"
  | "link"
  | "image"
  | "camera"
  | "lock"
  | "key"
  | "pencil"
  | "user"
  | "users"
  | "user-plus"
  | "mail"
  | "chat"
  | "phone"
  | "send"
  | "globe"
  | "menu"
  | "grid"
  | "list"
  | "sidebar"
  | "eye"
  | "eye-off"
  | "chevron-down"
  | "chevron-right"
  | "arrow-left"
  | "arrow-right"
  | "success"
  | "warning"
  | "info"
  | "error"
  | "pending"
  | "spark";

export const JALVORO_ICON_MANIFEST: Readonly<
  Record<
    JalvoroIconName,
    { category: JalvoroIconCategory; phase: 1 | 2; objects: 1 | 2 }
  >
> = {
  "dashboard": { category: "navigation", phase: 1, objects: 1 },
  "transactions": { category: "navigation", phase: 1, objects: 1 },
  "accounts": { category: "navigation", phase: 1, objects: 1 },
  "income": { category: "navigation", phase: 1, objects: 2 },
  "expenses": { category: "navigation", phase: 1, objects: 1 },
  "goals": { category: "navigation", phase: 1, objects: 1 },
  "payables": { category: "navigation", phase: 1, objects: 2 },
  "investments": { category: "navigation", phase: 1, objects: 1 },
  "analytics": { category: "navigation", phase: 1, objects: 1 },
  "ai-insights": { category: "navigation", phase: 1, objects: 1 },
  "reports": { category: "navigation", phase: 1, objects: 1 },
  "settings": { category: "navigation", phase: 1, objects: 1 },
  "add": { category: "actions", phase: 1, objects: 1 },
  "edit": { category: "actions", phase: 1, objects: 1 },
  "delete": { category: "actions", phase: 1, objects: 1 },
  "copy": { category: "actions", phase: 1, objects: 2 },
  "search": { category: "actions", phase: 1, objects: 1 },
  "filter": { category: "actions", phase: 1, objects: 1 },
  "sort": { category: "actions", phase: 1, objects: 1 },
  "share": { category: "actions", phase: 1, objects: 1 },
  "export": { category: "actions", phase: 1, objects: 2 },
  "import": { category: "actions", phase: 1, objects: 2 },
  "download": { category: "actions", phase: 1, objects: 1 },
  "upload": { category: "actions", phase: 1, objects: 1 },
  "refresh": { category: "actions", phase: 1, objects: 1 },
  "check": { category: "actions", phase: 1, objects: 1 },
  "close": { category: "actions", phase: 1, objects: 1 },
  "more": { category: "actions", phase: 1, objects: 1 },
  "undo": { category: "actions", phase: 1, objects: 1 },
  "redo": { category: "actions", phase: 1, objects: 1 },
  "wallet": { category: "finance", phase: 1, objects: 1 },
  "bank": { category: "finance", phase: 1, objects: 1 },
  "card": { category: "finance", phase: 1, objects: 1 },
  "cash": { category: "finance", phase: 1, objects: 1 },
  "coin": { category: "finance", phase: 1, objects: 1 },
  "receipt": { category: "finance", phase: 1, objects: 1 },
  "invoice": { category: "finance", phase: 1, objects: 1 },
  "budget": { category: "finance", phase: 1, objects: 2 },
  "savings": { category: "finance", phase: 1, objects: 1 },
  "trend-up": { category: "finance", phase: 1, objects: 1 },
  "trend-down": { category: "finance", phase: 1, objects: 1 },
  "transfer": { category: "finance", phase: 1, objects: 1 },
  "exchange": { category: "finance", phase: 1, objects: 2 },
  "calendar-money": { category: "finance", phase: 1, objects: 2 },
  "shield-money": { category: "finance", phase: 1, objects: 2 },
  "tax": { category: "finance", phase: 1, objects: 1 },
  "file": { category: "objects", phase: 2, objects: 1 },
  "folder": { category: "objects", phase: 2, objects: 1 },
  "bell": { category: "objects", phase: 2, objects: 1 },
  "clock": { category: "objects", phase: 2, objects: 1 },
  "calendar": { category: "objects", phase: 2, objects: 1 },
  "tag": { category: "objects", phase: 2, objects: 1 },
  "link": { category: "objects", phase: 2, objects: 2 },
  "image": { category: "objects", phase: 2, objects: 1 },
  "camera": { category: "objects", phase: 2, objects: 1 },
  "lock": { category: "objects", phase: 2, objects: 1 },
  "key": { category: "objects", phase: 2, objects: 1 },
  "pencil": { category: "objects", phase: 2, objects: 1 },
  "user": { category: "identity", phase: 2, objects: 1 },
  "users": { category: "identity", phase: 2, objects: 2 },
  "user-plus": { category: "identity", phase: 2, objects: 2 },
  "mail": { category: "communication", phase: 2, objects: 1 },
  "chat": { category: "communication", phase: 2, objects: 1 },
  "phone": { category: "communication", phase: 2, objects: 1 },
  "send": { category: "communication", phase: 2, objects: 1 },
  "globe": { category: "communication", phase: 2, objects: 1 },
  "menu": { category: "interface", phase: 2, objects: 1 },
  "grid": { category: "interface", phase: 2, objects: 1 },
  "list": { category: "interface", phase: 2, objects: 1 },
  "sidebar": { category: "interface", phase: 2, objects: 1 },
  "eye": { category: "interface", phase: 2, objects: 1 },
  "eye-off": { category: "interface", phase: 2, objects: 1 },
  "chevron-down": { category: "interface", phase: 2, objects: 1 },
  "chevron-right": { category: "interface", phase: 2, objects: 1 },
  "arrow-left": { category: "interface", phase: 2, objects: 1 },
  "arrow-right": { category: "interface", phase: 2, objects: 1 },
  "success": { category: "status", phase: 2, objects: 1 },
  "warning": { category: "status", phase: 2, objects: 1 },
  "info": { category: "status", phase: 2, objects: 1 },
  "error": { category: "status", phase: 2, objects: 1 },
  "pending": { category: "status", phase: 2, objects: 1 },
  "spark": { category: "status", phase: 2, objects: 1 },
};

export const JALVORO_ICON_NAMES = Object.freeze(
  Object.keys(JALVORO_ICON_MANIFEST) as JalvoroIconName[],
);
