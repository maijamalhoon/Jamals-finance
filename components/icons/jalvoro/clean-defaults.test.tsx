import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JALVORO_ICON_DEFINITIONS } from "./definitions";
import { JalvoroIcon } from "./JalvoroIcon";
import { JALVORO_ICON_NAMES } from "./manifest";

describe("JALVORO clean defaults", () => {
  it("renders every icon without a default micro-accent", () => {
    for (const name of JALVORO_ICON_NAMES) {
      const markup = renderToStaticMarkup(<JalvoroIcon name={name} />);
      expect(markup).toContain('data-jalvoro-accent="none"');
      expect(markup).not.toContain("data-jalvoro-micro-accent");
    }
  });

  it("keeps all definition defaults clean", () => {
    for (const definition of JALVORO_ICON_DEFINITIONS) {
      expect(definition.defaultAccent).toBe("none");
    }
  });
});
