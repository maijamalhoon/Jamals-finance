import { readFile } from "node:fs/promises";

const filesThatMustUseTheBrandSystem = [
  "app/layout.tsx",
  "app/login/layout.tsx",
  "app/pwa-register.tsx",
];

const generatedPublicFiles = [
  "public/manifest.json",
  "public/offline.html",
  "public/icons/icon.svg",
];

const forbiddenLiteral = "Jamal's Finance";
const failures = [];

for (const file of [...filesThatMustUseTheBrandSystem, ...generatedPublicFiles]) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  if (source.includes(forbiddenLiteral)) {
    failures.push(`${file} still contains the legacy public brand literal.`);
  }
}

const config = JSON.parse(
  await readFile(new URL("../brand/brand.config.json", import.meta.url), "utf8"),
);

const requiredValues = {
  name: "JALVORO",
  tagline: "Everything you run. One place.",
  internalId: "jf-platform",
};

for (const [key, expected] of Object.entries(requiredValues)) {
  if (config[key] !== expected) {
    failures.push(`brand/brand.config.json must set ${key} to ${expected}.`);
  }
}

if (failures.length) {
  console.error("Brand system check failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Brand system foundation check passed.");
