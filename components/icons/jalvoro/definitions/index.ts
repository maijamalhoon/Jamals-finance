import { NAVIGATION_ICON_DEFINITIONS } from "./navigation";
import { ACTIONS_ICON_DEFINITIONS } from "./actions";
import { FINANCE_ICON_DEFINITIONS } from "./finance";
import { OBJECTS_ICON_DEFINITIONS } from "./objects";
import { IDENTITY_ICON_DEFINITIONS } from "./identity";
import { COMMUNICATION_ICON_DEFINITIONS } from "./communication";
import { INTERFACE_ICON_DEFINITIONS } from "./interface";
import { STATUS_ICON_DEFINITIONS } from "./status";

export * from "./navigation";
export * from "./actions";
export * from "./finance";
export * from "./objects";
export * from "./identity";
export * from "./communication";
export * from "./interface";
export * from "./status";

export const JALVORO_ICON_DEFINITIONS = [
  ...NAVIGATION_ICON_DEFINITIONS,
  ...ACTIONS_ICON_DEFINITIONS,
  ...FINANCE_ICON_DEFINITIONS,
  ...OBJECTS_ICON_DEFINITIONS,
  ...IDENTITY_ICON_DEFINITIONS,
  ...COMMUNICATION_ICON_DEFINITIONS,
  ...INTERFACE_ICON_DEFINITIONS,
  ...STATUS_ICON_DEFINITIONS,
] as const;
