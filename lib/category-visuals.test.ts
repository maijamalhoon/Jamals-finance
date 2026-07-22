import { describe, expect, it } from "vitest";

import { getSemanticCategoryIconKey } from "./category-visuals";

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
});
