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
    expect(getSemanticCategoryIconKey("rent", "expense")).toBe("rent");
  });


  it("uses distinct semantic icons for common categories instead of generic tags", () => {
    expect(getSemanticCategoryIconKey("Bills", "expense")).toBe("bills");
    expect(getSemanticCategoryIconKey("Help", "expense")).toBe("help");
    expect(getSemanticCategoryIconKey("Investments", "expense")).toBe("investments");
    expect(getSemanticCategoryIconKey("Charity", "expense")).toBe("charity");
    expect(getSemanticCategoryIconKey("Insurance", "expense")).toBe("insurance");
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
