import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const generator = resolve(root, "scripts/generate-jalvoro-lucide-runtime.mjs");
const runtime = resolve(
  root,
  "components/icons/jalvoro/lucide-runtime.generated.tsx",
);
const diagnosticPath = resolve(root, "build/jalvoro-icon-parser-diff.json");

function exportedNames(source: string) {
  return new Set(
    [...source.matchAll(/^export const ([A-Za-z_$][\w$]*) =/gm)].map(
      (match) => match[1],
    ),
  );
}

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
    const beforeNames = exportedNames(before);
    const afterNames = exportedNames(after);
    const missing = [...beforeNames].filter((name) => !afterNames.has(name));
    const extra = [...afterNames].filter((name) => !beforeNames.has(name));

    if (before !== after || result.status !== 0) {
      mkdirSync(resolve(root, "build"), { recursive: true });
      writeFileSync(
        diagnosticPath,
        JSON.stringify(
          {
            exitStatus: result.status,
            stderr: result.stderr,
            stdout: result.stdout,
            beforeCount: beforeNames.size,
            afterCount: afterNames.size,
            missing,
            extra,
          },
          null,
          2,
        ),
        "utf8",
      );
    }

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("fallback parser");
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    expect(after).toBe(before);
    expect(after).toContain("export const Search =");
    expect(after).toContain("export const ShieldCheck =");
  });
});
