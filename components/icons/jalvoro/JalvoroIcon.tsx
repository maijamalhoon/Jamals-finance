import { forwardRef } from "react";

import { jalvoroIconRegistry } from "./registry";
import type { JalvoroIconName } from "./manifest";
import type { JalvoroIconProps } from "./types";

export type JalvoroIconByNameProps = JalvoroIconProps & {
  name: JalvoroIconName;
};

export const JalvoroIcon = forwardRef<SVGSVGElement, JalvoroIconByNameProps>(
  function JalvoroIcon({ name, ...props }, ref) {
    const Component = jalvoroIconRegistry[name];
    return <Component ref={ref} {...props} />;
  },
);

JalvoroIcon.displayName = "JalvoroIcon";
