import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const standardCssSource = readFileSync(
  new URL("../app/standard-motion-ultra.css", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const standardRuntimeSource = readFileSync(
  new URL(
    "../components/performance/StandardMotionPerformance.tsx",
    import.meta.url,
  ),
  "utf8",
);
const mobileSearchSource = readFileSync(
  new URL("../components/layout/MobileHeaderSearch.tsx", import.meta.url),
  "utf8",
);
const countedAmountSource = readFileSync(
  new URL("../components/motion/CountedAmount.tsx", import.meta.url),
  "utf8",
);
const animationConfigSource = readFileSync(
  new URL("../components/motion/animation-config.ts", import.meta.url),
  "utf8",
);

describe("standard motion ultra contracts", () => {
  it("keeps the polish layer isolated to Standard/green mode", () => {
    expect(layoutSource).toContain('import "./standard-motion-ultra.css"');
    expect(standardCssSource).toContain(
      'html[data-animation-mode="standard"]',
    );
    expect(standardCssSource).not.toContain(
      'html[data-animation-mode="fast"]',
    );
    expect(standardCssSource).not.toContain(
      'html[data-animation-mode="none"]',
    );
  });

  it("preserves Standard mode while adapting its runtime tier", () => {
    expect(standardRuntimeSource).toContain("connection?.saveData");
    expect(standardRuntimeSource).toContain('return "lite"');
    expect(standardRuntimeSource).toContain(
      "root.dataset.standardMotionTier = resolveStandardMotionTier()",
    );
    expect(standardRuntimeSource).not.toContain(
      'tier === "lite" && !isEssentialMotion',
    );
    expect(standardRuntimeSource).not.toContain(
      'tier !== "lite" || isEssentialMotion',
    );
  });

  it("adapts Standard motion to device, network, viewport, and user preference", () => {
    expect(standardRuntimeSource).toContain("effectiveType");
    expect(standardRuntimeSource).toContain("downlink");
    expect(standardRuntimeSource).toContain("runtimeNavigator.deviceMemory");
    expect(standardRuntimeSource).toContain("runtimeNavigator.hardwareConcurrency");
    expect(standardRuntimeSource).toContain('(max-width: 767px)');
    expect(standardRuntimeSource).toContain(
      '(prefers-reduced-motion: reduce)',
    );
  });

  it("tracks page visibility without installing a continuous animation scanner", () => {
    expect(standardRuntimeSource).toContain("document.visibilityState");
    expect(standardRuntimeSource).toContain(
      'document.addEventListener("visibilitychange", handleVisibilityChange)',
    );
    expect(standardRuntimeSource).toContain("standardPageVisibility");
    expect(standardRuntimeSource).not.toContain("IntersectionObserver");
    expect(standardRuntimeSource).not.toContain("requestIdleCallback");
  });

  it("uses compositor motion for Standard mobile search", () => {
    expect(mobileSearchSource).toContain(
      'const standardMode = animationMode === "standard"',
    );
    expect(mobileSearchSource).toContain("clipPath: collapsedClipPath");
    expect(mobileSearchSource).toContain(
      'will-change-[transform,clip-path,opacity]',
    );
    expect(mobileSearchSource).toContain("duration: 0.24");
  });

  it("bounds Standard digit and chart work without removing animation", () => {
    expect(countedAmountSource).toContain("STANDARD_COUNT_MAX_MS = 880");
    expect(countedAmountSource).toContain("STANDARD_MAX_DELAY_MS = 110");
    expect(countedAmountSource).toContain(
      'animationMode === "standard" || animateOnCompact',
    );
    expect(animationConfigSource).toContain(
      "chart: standardMilliseconds(540, 850)",
    );
    expect(animationConfigSource).toContain(
      "staggerChildren: standardSeconds(0.012, 0.035)",
    );
  });

  it("keeps loaders, popups, menus, forms and charts on bounded motion paths", () => {
    expect(standardCssSource).toContain("jf-standard-route-loader-ultra-glide");
    expect(standardCssSource).toContain('[data-slot="dialog-content"]');
    expect(standardCssSource).toContain('[data-slot="dropdown-menu-content"]');
    expect(standardCssSource).toContain('[data-slot="select-content"]');
    expect(standardCssSource).toContain('[data-chart-tone] .recharts-wrapper');
    expect(standardCssSource).toContain("contain: layout paint");
  });
});
