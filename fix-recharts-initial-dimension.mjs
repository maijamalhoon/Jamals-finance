import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".vercel",
]);

const TARGET_EXTENSIONS = new Set([".tsx", ".jsx", ".ts", ".js"]);

const INITIAL_DIMENSION = ' initialDimension={{ width: 720, height: 280 }}';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function patchResponsiveContainer(source) {
  return source.replace(/<ResponsiveContainer\b([\s\S]*?)>/g, (match) => {
    if (match.includes("initialDimension=")) return match;

    if (match.endsWith("/>")) {
      return match.replace(/\s*\/>$/, `${INITIAL_DIMENSION} />`);
    }

    return match.replace(/\s*>$/, `${INITIAL_DIMENSION}>`);
  });
}

let changedCount = 0;

for (const filePath of walk(ROOT)) {
  const before = fs.readFileSync(filePath, "utf8");

  if (!before.includes("<ResponsiveContainer")) continue;

  const after = patchResponsiveContainer(before);

  if (after !== before) {
    fs.writeFileSync(filePath, after);
    changedCount += 1;
    console.log(`Patched: ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`Done. Files changed: ${changedCount}`);
