import { createJalvoroIcon } from "../core";
import {
  successIconDefinition,
  warningIconDefinition,
  infoIconDefinition,
  errorIconDefinition,
  pendingIconDefinition,
  sparkIconDefinition,
} from "../definitions/status";

export const JalvoroSuccessIcon = /* @__PURE__ */ createJalvoroIcon(successIconDefinition);
export const JalvoroWarningIcon = /* @__PURE__ */ createJalvoroIcon(warningIconDefinition);
export const JalvoroInfoIcon = /* @__PURE__ */ createJalvoroIcon(infoIconDefinition);
export const JalvoroErrorIcon = /* @__PURE__ */ createJalvoroIcon(errorIconDefinition);
export const JalvoroPendingIcon = /* @__PURE__ */ createJalvoroIcon(pendingIconDefinition);
export const JalvoroSparkIcon = /* @__PURE__ */ createJalvoroIcon(sparkIconDefinition);
