import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const legacyPackage = ["lucide", "react"].join("-");
const legacySpecifier = new RegExp(`["\']${legacyPackage}(?:/[^"\']*)?["\']`);
const legacyAlias = `"${legacyPackage}":`;
const ignored = new Set([".git", ".next", ".vercel", "build", "coverage", "design of  UI", "node_modules", "out"]);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (ignored.has(entry)) return [];
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry) ? [absolute] : [];
  });
}

describe("JALVORO direct source migration", () => {
  it("contains no third-party Lucide module specifier in application source", () => {
    const offenders = sourceFiles(root).filter((file) =>
      legacySpecifier.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("removes the Lucide package and Next.js resolver aliases", () => {
    const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    const nextConfig = readFileSync(path.join(root, "next.config.ts"), "utf8");
    expect(packageJson.dependencies?.[legacyPackage]).toBeUndefined();
    expect(packageJson.scripts?.["generate:icons"]).toBeUndefined();
    expect(nextConfig).not.toContain("jalvoroLucideRuntime");
    expect(nextConfig).not.toContain(legacyAlias);
  });

  it("keeps the first-party compatibility wrapper prop-transparent", () => {
    const compat = readFileSync(
      path.join(root, "components/icons/jalvoro/compat.tsx"),
      "utf8",
    );
    expect(compat).toContain("...props");
    expect(compat).toContain("ref={ref}");
    expect(compat).not.toMatch(/size:\s*\d/);
    expect(compat).not.toMatch(/strokeWidth:\s*\d/);
    expect(compat).not.toMatch(/color:\s*["'\x60]/);
  });
});
