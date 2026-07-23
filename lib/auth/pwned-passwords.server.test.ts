import { describe, expect, it } from "vitest";

import {
  createPwnedPasswordHashRange,
  findPwnedPasswordCount,
} from "./pwned-passwords.server";

describe("Pwned Passwords helpers", () => {
  it("creates the documented SHA-1 k-anonymity range", () => {
    expect(createPwnedPasswordHashRange("password")).toEqual({
      prefix: "5BAA6",
      suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8",
    });
  });

  it("finds an exposed password without returning padded zero rows", () => {
    const response = [
      "00000000000000000000000000000000000:0",
      "1E4C9B93F3F0682250B6CF8331B7EE68FD8:1048576",
      "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:2",
    ].join("\r\n");

    expect(
      findPwnedPasswordCount(
        response,
        "1E4C9B93F3F0682250B6CF8331B7EE68FD8",
      ),
    ).toBe(1_048_576);
  });

  it("returns zero when the suffix is absent", () => {
    expect(
      findPwnedPasswordCount(
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:2\r\n",
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      ),
    ).toBe(0);
  });
});
