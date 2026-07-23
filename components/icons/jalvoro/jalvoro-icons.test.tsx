import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JALVORO_ICON_DEFINITIONS } from "./definitions";
import { JalvoroIcon } from "./JalvoroIcon";
import { JALVORO_ICON_NAMES } from "./manifest";
import { jalvoroIconDefinitions, jalvoroIconRegistry } from "./registry";
import { JALVORO_ICON_TOKENS } from "./tokens";

const EXPECTED_ICON_COUNT = 82;

describe("JALVORO icon system", () => {
  it("keeps registry, manifest, and definitions in lockstep", () => {
    expect(JALVORO_ICON_NAMES).toHaveLength(EXPECTED_ICON_COUNT);
    expect(Object.keys(jalvoroIconRegistry)).toEqual(JALVORO_ICON_NAMES);
    expect(Object.keys(jalvoroIconDefinitions)).toEqual(JALVORO_ICON_NAMES);
    expect(JALVORO_ICON_DEFINITIONS).toHaveLength(EXPECTED_ICON_COUNT);
    expect(new Set(JALVORO_ICON_NAMES).size).toBe(EXPECTED_ICON_COUNT);
  });

  it("enforces one-object clarity with an explicit two-object ceiling", () => {
    for (const definition of JALVORO_ICON_DEFINITIONS) {
      expect([1, 2]).toContain(definition.objects);
      expect(definition.body.length).toBeGreaterThan(0);
      expect(definition.body.length).toBeLessThanOrEqual(8);
    }
  });

  it("renders every icon without hard-coded SVG colors", () => {
    for (const name of JALVORO_ICON_NAMES) {
      const markup = renderToStaticMarkup(
        <JalvoroIcon name={name} size={20} accent="wave" />,
      );
      expect(markup).toContain(`data-jalvoro-icon="${name}"`);
      expect(markup).not.toMatch(/(?:stroke|fill)="#[0-9a-f]{3,8}"/i);
      expect(markup).not.toMatch(/(?:stroke|fill)="(?:rgb|hsl|oklch)\(/i);
    }
  });

  it("uses the approved thin-by-default stroke hierarchy", () => {
    expect(JALVORO_ICON_TOKENS.stroke.compact).toBeLessThan(JALVORO_ICON_TOKENS.stroke.content);
    expect(JALVORO_ICON_TOKENS.stroke.content).toBeLessThan(JALVORO_ICON_TOKENS.stroke.heading);
    expect(JALVORO_ICON_TOKENS.stroke.heading).toBeLessThan(JALVORO_ICON_TOKENS.stroke.hero);
  });

  it("keeps decorative icons hidden and titled icons accessible", () => {
    expect(renderToStaticMarkup(<JalvoroIcon name="search" />)).toContain('aria-hidden="true"');
    const labelled = renderToStaticMarkup(<JalvoroIcon name="search" title="Search" />);
    expect(labelled).toContain("<title>Search</title>");
    expect(labelled).toContain('role="img"');
    expect(labelled).not.toContain('aria-hidden="true"');
  });
});
