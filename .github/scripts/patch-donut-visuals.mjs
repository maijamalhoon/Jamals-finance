import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(filePath, from, to) {
  const source = readFileSync(filePath, "utf8");
  const occurrences = source.split(from).length - 1;

  if (occurrences !== 1) {
    throw new Error(
      `${filePath}: expected exactly one matching block, found ${occurrences}`,
    );
  }

  writeFileSync(filePath, source.replace(from, to));
}

const changes = [
  {
    file: "components/dashboard/SpendingBreakdown.tsx",
    replacements: [
      [
        `                    paddingAngle={2}\n                    isAnimationActive={!reduceMotion}`,
        `                    paddingAngle={2}\n                    cornerRadius={8}\n                    isAnimationActive={!reduceMotion}`,
      ],
      [
        `              <div className="flex w-[56%] min-w-0 flex-col items-center justify-center">`,
        `              <div className="flex w-[50%] min-w-0 flex-col items-center justify-center">`,
      ],
      [
        `                  className="max-w-full whitespace-nowrap font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums"`,
        `                  className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums"`,
      ],
      [
        `                  style={{ fontSize: "clamp(0.78rem, 7.2cqw, 1.3rem)" }}`,
        `                  style={{ fontSize: "clamp(0.72rem, 6.1cqw, 1.08rem)" }}`,
      ],
      [
        `                <p className="mt-1.5 whitespace-nowrap text-[10px] font-semibold text-text-secondary sm:text-[11px]">`,
        `                <p className="mt-1 whitespace-nowrap text-[9px] font-semibold text-text-secondary sm:text-[10px]">`,
      ],
    ],
  },
  {
    file: "components/dashboard/InvestmentOverviewWidget.tsx",
    replacements: [
      [
        `            <div className="relative mx-auto aspect-square w-full max-w-[240px] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]">`,
        `            <div className="relative mx-auto aspect-square w-full max-w-[240px] [container-type:inline-size] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]">`,
      ],
      [
        `                      paddingAngle={2}\n                      isAnimationActive={!reduceMotion}`,
        `                      paddingAngle={2}\n                      cornerRadius={8}\n                      isAnimationActive={!reduceMotion}`,
      ],
      [
        `                <div className="w-[58%] min-w-0 px-1">`,
        `                <div className="w-[52%] min-w-0 px-1">`,
      ],
      [
        `                  <p className="whitespace-nowrap text-[clamp(1.15rem,5.4vw,1.8rem)] font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums">`,
        `                  <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.76rem,6.1cqw,1.08rem)] font-black leading-none tracking-[-0.04em] text-text-primary tabular-nums">`,
      ],
      [
        `                  <p\n                    className="mt-2 text-sm font-black leading-none tabular-nums sm:text-base"\n                    style={{ color: pnlColor }}\n                  >`,
        `                  <p\n                    className="mt-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.68rem,5.2cqw,0.9rem)] font-black leading-none tabular-nums"\n                    style={{ color: pnlColor }}\n                  >`,
      ],
      [
        `                  <p className="mt-2 text-[9px] font-bold uppercase leading-none tracking-[0.13em] text-text-tertiary sm:text-[10px]">`,
        `                  <p className="mt-1.5 whitespace-nowrap text-[8px] font-bold uppercase leading-none tracking-[0.11em] text-text-tertiary sm:text-[9px]">`,
      ],
    ],
  },
  {
    file: "components/analytics/AnalyticsCharts.tsx",
    replacements: [
      [
        `      <div className="relative min-w-0">`,
        `      <div className="relative min-w-0 [container-type:inline-size]">`,
      ],
      [
        `                  cornerRadius={5}`,
        `                  cornerRadius={8}`,
      ],
      [
        `          <div className="max-w-28 text-center">`,
        `          <div className="w-[52%] max-w-24 min-w-0 text-center">`,
      ],
      [
        `            <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-text-tertiary">`,
        `            <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-text-tertiary">`,
      ],
      [
        `            <p className="mt-1 break-words text-sm font-extrabold tabular-nums text-text-primary">`,
        `            <p className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(0.7rem,4.8cqw,0.82rem)] font-extrabold tabular-nums text-text-primary">`,
      ],
    ],
  },
  {
    file: "components/investments/InvestmentOverviewClean.tsx",
    replacements: [
      [
        `        <div className="relative mt-3 rounded-[22px] bg-surface-secondary/35 py-2">`,
        `        <div className="relative mt-3 rounded-[22px] bg-surface-secondary/35 py-2 [container-type:inline-size]">`,
      ],
      [
        `            <div className="max-w-[132px] text-center">`,
        `            <div className="w-[52%] max-w-[118px] min-w-0 text-center">`,
      ],
      [
        `              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">\n                Current value\n              </p>`,
        `              <p className="whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.1em] text-text-secondary sm:text-[9px]">\n                Current value\n              </p>`,
      ],
      [
        `              <p className="mt-1 break-words text-sm font-bold tabular-nums text-text-primary [overflow-wrap:anywhere]">\n                {formatCurrency(totalValue, { compact: true })}\n              </p>`,
        `              <p\n                className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(0.7rem,5.1cqw,0.84rem)] font-bold tabular-nums text-text-primary"\n                title={formatCurrency(totalValue)}\n              >\n                {formatCurrency(totalValue, { compact: true })}\n              </p>`,
      ],
      [
        `                <p className="mt-1 truncate text-[10px] text-text-secondary">`,
        `                <p className="mt-1 truncate text-[9px] text-text-secondary">`,
      ],
    ],
  },
];

for (const { file, replacements } of changes) {
  for (const [from, to] of replacements) {
    replaceOnce(file, from, to);
  }
}

console.log("Applied focused donut rounding and center-label sizing updates.");
