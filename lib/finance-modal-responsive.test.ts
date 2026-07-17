import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const financeModalSource = readFileSync(
  new URL("../components/ui/finance-modal.tsx", import.meta.url),
  "utf8",
);

describe("finance modal responsive shell", () => {
  it("removes desktop centering when the mobile dialog uses viewport insets", () => {
    const mobileRule = globalsCss.match(
      /@media \(max-width: 639px\) \{\s*\[data-slot="dialog-content"\]\.finance-modal-content,[\s\S]*?\n  \}\n\}/,
    )?.[0];

    expect(mobileRule).toBeDefined();
    expect(mobileRule).toContain("right: 0.375rem");
    expect(mobileRule).toContain("left: 0.375rem");
    expect(mobileRule).toContain("--tw-translate-x: 0px");
    expect(mobileRule).toContain("--tw-translate-y: 0px");
    expect(mobileRule).toContain("transform: none");
  });

  it("keeps long forms scrollable with mobile-safe height and footer spacing", () => {
    expect(financeModalSource).toContain(
      "max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)]",
    );
    expect(financeModalSource).toContain("overflow-y-auto overscroll-contain");
    expect(financeModalSource).toContain("env(safe-area-inset-bottom)");
    expect(financeModalSource).toContain("grid-cols-1");
    expect(financeModalSource).toContain("sm:grid-cols-2");
  });
});
