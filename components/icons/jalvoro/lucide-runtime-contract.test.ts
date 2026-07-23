import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtimePath = path.join(
  root,
  "components/icons/jalvoro/lucide-runtime.cjs",
);
const runtimeSource = readFileSync(runtimePath, "utf8");
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
  it("aliases the complete lucide package to the JALVORO runtime", () => {
    expect(nextConfigSource).toContain('"lucide-react": jalvoroLucideRuntime');
    expect(nextConfigSource).toContain(
      '"components/icons/jalvoro/lucide-runtime.cjs"',
    );
    expect(packageJson.scripts.dev).toContain("--webpack");
    expect(packageJson.scripts.build).toContain("--webpack");
  });

  it("preserves caller-controlled dimensions, stroke, class and color props", () => {
    expect(runtimeSource).toContain("...props");
    expect(runtimeSource).toContain("color,");
    expect(runtimeSource).not.toMatch(/size:\s*\d/);
    expect(runtimeSource).not.toMatch(/strokeWidth:\s*\d/);
    expect(runtimeSource).not.toMatch(/color:\s*["'`]/);
    expect(runtimeSource).toContain('"data-jalvoro-source-name": name');
  });

  it("routes representative workspace semantics to first-party icons", () => {
    for (const expected of [
      "Search: Icons.JalvoroSearchIcon",
      "Trash2: Icons.JalvoroDeleteIcon",
      "Pencil: Icons.JalvoroPencilIcon",
      "Wallet: Icons.JalvoroWalletIcon",
      "Bell: Icons.JalvoroBellIcon",
      "Settings2: Icons.JalvoroSettingsIcon",
      "BrainCircuit: Icons.JalvoroAiInsightsIcon",
      "BarChart3: Icons.JalvoroAnalyticsIcon",
    ]) {
      expect(runtimeSource).toContain(expected);
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
