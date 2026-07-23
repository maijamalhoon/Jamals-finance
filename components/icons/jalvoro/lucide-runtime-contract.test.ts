import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtimePath = path.join(
  root,
  "components/icons/jalvoro/lucide-runtime.generated.tsx",
);
const generatorPath = path.join(
  root,
  "scripts/generate-jalvoro-lucide-runtime.mjs",
);
const runtimeSource = readFileSync(runtimePath, "utf8");
const generatorSource = readFileSync(generatorPath, "utf8");
const nextConfigSource = readFileSync(path.join(root, "next.config.ts"), "utf8");
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    const relative = path.relative(root, absolute);
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === ".next" ||
      entry === "design of  UI"
    ) {
      return [];
    }
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry) ? [relative] : [];
  });
}

describe("JALVORO full-workspace icon runtime", () => {
  it("generates and aliases the complete workspace module", () => {
    expect(existsSync(runtimePath)).toBe(true);
    expect(nextConfigSource).toContain("turbopack:");
    expect(nextConfigSource).toContain("resolveAlias:");
    expect(nextConfigSource).toContain('"lucide-react": jalvoroLucideRuntime');
    expect(nextConfigSource).toContain(
      '"components/icons/jalvoro/lucide-runtime.generated.tsx"',
    );
    expect(packageJson.scripts["generate:icons"]).toContain(
      "generate-jalvoro-lucide-runtime.mjs",
    );
    expect(packageJson.scripts.postinstall).toBe("npm run generate:icons");
    expect(packageJson.scripts.predev).toBe("npm run generate:icons");
    expect(packageJson.scripts.prebuild).toBe("npm run generate:icons && npm run brand:sync");
    expect(packageJson.scripts.dev).toBe("next dev");
    expect(packageJson.scripts.build).toBe("next build");
  });

  it("preserves caller-controlled dimensions, stroke, class and color props", () => {
    expect(runtimeSource).toContain("...props");
    expect(runtimeSource).not.toMatch(/size:\s*\d/);
    expect(runtimeSource).not.toMatch(/strokeWidth:\s*\d/);
    expect(runtimeSource).not.toMatch(/color:\s*["'`]/);
    expect(runtimeSource).toContain("data-jalvoro-source-name={sourceName}");
  });

  it("contains stable semantic mappings for representative workspace icons", () => {
    for (const expected of [
      'Search: "JalvoroSearchIcon"',
      'Trash2: "JalvoroDeleteIcon"',
      'Pencil: "JalvoroPencilIcon"',
      'Wallet: "JalvoroWalletIcon"',
      'Bell: "JalvoroBellIcon"',
      'Settings2: "JalvoroSettingsIcon"',
      'BrainCircuit: "JalvoroAiInsightsIcon"',
      'BarChart3: "JalvoroAnalyticsIcon"',
    ]) {
      expect(generatorSource).toContain(expected);
    }
  });

  it("does not allow an unaliased lucide subpath to bypass the runtime", () => {
    const offenders = sourceFiles(root).filter((file) => {
      const source = readFileSync(path.join(root, file), "utf8");
      return /["']lucide-react\//.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
