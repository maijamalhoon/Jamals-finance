import { readFileSync, writeFileSync } from "node:fs";

const filePath = "components/dashboard/InvestmentOverviewWidget.tsx";
let source = readFileSync(filePath, "utf8");

function replaceOnce(from, to, label) {
  const occurrences = source.split(from).length - 1;

  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${occurrences}`);
  }

  source = source.replace(from, to);
}

replaceOnce(
  `              <ChartFrame>`,
  `              <ChartFrame className="!overflow-visible [&>div]:!overflow-visible">`,
  "portfolio chart overflow",
);

replaceOnce(
  `                      allowEscapeViewBox={{ x: true, y: true }}\n                      wrapperStyle={{`,
  `                      allowEscapeViewBox={{ x: true, y: true }}\n                      position={\n                        width < 270\n                          ? { x: Math.max(12, width / 2 - 78), y: -10 }\n                          : { x: width - 18, y: Math.max(6, height * 0.18) }\n                      }\n                      wrapperStyle={{`,
  "portfolio tooltip position",
);

replaceOnce(
  `                    Portfolio value\n                  </p>`,
  `                    Portfolio\n                  </p>`,
  "portfolio center heading",
);

writeFileSync(filePath, source);
console.log("Applied the focused portfolio donut heading and tooltip update.");
