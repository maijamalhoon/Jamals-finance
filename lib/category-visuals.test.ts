import { describe, expect, it } from "vitest";

import {
  getCategoryVisual,
  getSemanticCategoryIconKey,
  isValidCategoryIconKey,
} from "./category-visuals";

describe("category visual intelligence", () => {
  it.each([
    ["", "income", "tags"],
    ["Category", "income", "tags"],
    ["grocries", "income", "groceries"],
    ["groceries", "income", "groceries"],
    ["groc", "income", "groceries"],
    ["personal", "income", "personal"],
    ["painting", "income", "painting"],
    ["maintainance", "income", "repair"],
    ["maintenance", "income", "repair"],
    ["drink", "income", "drink"],
    ["credit card", "expense", "credit"],
    ["coffee", "expense", "drink"],
    ["cat", "expense", "pets"],
    ["unmapped custom category", "expense", "tags"],
  ] as const)("maps %s to %s", (name, type, expected) => {
    expect(getSemanticCategoryIconKey(name, type)).toBe(expected);
  });

  it("uses the category type to distinguish rent income from rent expense", () => {
    expect(getSemanticCategoryIconKey("rent", "income")).toBe("building");
    expect(getSemanticCategoryIconKey("rent", "expense")).toBe("home");
  });

  it("keeps saved colors but replaces legacy emoji presentation with a custom icon", () => {
    expect(isValidCategoryIconKey("emoji:🧪")).toBe(false);
    expect(
      getCategoryVisual({
        id: "category-1",
        name: "Medicine",
        type: "expense",
        color: "#123abc",
        icon_key: "emoji:🧪",
      }),
    ).toEqual({
      color: "#123ABC",
      iconKey: "medical",
    });
  });

  it("keeps valid saved custom icon keys", () => {
    expect(isValidCategoryIconKey("salary")).toBe(true);
    expect(
      getCategoryVisual({
        id: "category-2",
        name: "Monthly pay",
        type: "income",
        color: "#2563EB",
        icon_key: "briefcase",
      }).iconKey,
    ).toBe("briefcase");
  });
});
