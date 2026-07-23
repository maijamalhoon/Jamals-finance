import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const generator = resolve(root, "scripts/generate-jalvoro-lucide-runtime.mjs");
const runtime = resolve(
  root,
  "components/icons/jalvoro/lucide-runtime.generated.tsx",
);

describe("JALVORO icon generator deployment runtime", () => {
  it("produces the same runtime without the TypeScript package", () => {
    const before = readFileSync(runtime, "utf8");
    const result = spawnSync(process.execPath, [generator], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        JALVORO_ICON_PARSER: "fallback",
      },
    });
    const after = readFileSync(runtime, "utf8");

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("fallback parser");
    expect(after).toBe(before);
    expect(after).toContain("export const Search =");
    expect(after).toContain("export const ShieldCheck =");
  });
});
