import { describe, expect, it } from "vitest";

import { getUserMutationError } from "./user-errors";

describe("user-safe mutation errors", () => {
  it("maps known failure classes without exposing backend details", () => {
    expect(getUserMutationError({ code: "23505", message: "secret table detail" }, "Fallback")).toBe(
      "A matching record already exists.",
    );
    expect(getUserMutationError({ status: 401 }, "Fallback")).toBe(
      "Your session expired. Sign in again.",
    );
    expect(getUserMutationError(new TypeError("failed to fetch"), "Fallback")).toBe(
      "Check your connection and try again.",
    );
  });

  it("uses the caller's safe fallback for unknown errors", () => {
    expect(
      getUserMutationError({ message: "relation private_table does not exist" }, "Could not save."),
    ).toBe("Could not save.");
  });
});
