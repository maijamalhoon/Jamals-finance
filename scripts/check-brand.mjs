import { readFile } from "node:fs/promises";

const filesThatMustUseTheBrandSystem = [
  "app/page.tsx",
  "app/manifest.ts",
  "app/opengraph-image.tsx",
  "lib/constants.ts",
];

const forbiddenLiteral = "Jamal's Finance";
const failures = [];

for (const file of filesThatMustUseTheBrandSystem) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  if (source.includes(forbiddenLiteral)) {
    failures.push(`${file} still contains the legacy public brand literal.`);
  }
}

const brandSource = await readFile(
  new URL("../brand/brand.config.ts", import.meta.url),
  "utf8",
);

for (const required of ["JALVORO", "Everything you run. One place.", "jf-platform"]) {
  if (!brandSource.includes(required)) {
    failures.push(`brand/brand.config.ts is missing required value: ${required}`);
  }
}

if (failures.length) {
  console.error("Brand system check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Brand system check passed.");
