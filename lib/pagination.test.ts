import { describe, expect, it } from "vitest";

import { getPaginationState } from "./pagination";

describe("getPaginationState", () => {
  it("uses the first page for missing or invalid input", () => {
    expect(getPaginationState(45, undefined, 20)).toMatchObject({
      currentPage: 1,
      startIndex: 0,
      endIndex: 20,
      totalPages: 3,
    });
    expect(getPaginationState(45, "not-a-page", 20).currentPage).toBe(1);
  });

  it("clamps a page beyond the available range", () => {
    expect(getPaginationState(45, 99, 20)).toMatchObject({
      currentPage: 3,
      startIndex: 40,
      endIndex: 45,
      totalPages: 3,
    });
  });

  it("keeps an empty list on a stable first page", () => {
    expect(getPaginationState(0, 4, 20)).toEqual({
      currentPage: 1,
      endIndex: 0,
      pageSize: 20,
      startIndex: 0,
      totalItems: 0,
      totalPages: 1,
    });
  });
});
