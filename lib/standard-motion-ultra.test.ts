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

  it("preserves every visible Standard animation on lite devices", () => {
    expect(standardRuntimeSource).toContain(
      'root.dataset.standardVisibleMotion = "preserved"',
    );
    expect(standardRuntimeSource).toContain(
      'elementVisibility.get(element) !== false',
    );
    expect(standardRuntimeSource).not.toContain(
      'tier === "lite" && !isEssentialMotion',
    );
    expect(standardRuntimeSource).not.toContain(
      'tier !== "lite" || isEssentialMotion',
    );
  });

  it("adapts Standard motion to refresh rate and runtime pressure", () => {
    expect(standardRuntimeSource).toContain("standardRefreshTier");
    expect(standardRuntimeSource).toContain("medianFrameMs <= 10.5");
    expect(standardRuntimeSource).toContain(
      'PerformanceObserver.supportedEntryTypes?.includes("longtask")',
    );
    expect(standardRuntimeSource).toContain(
      'PerformanceObserver.supportedEntryTypes?.includes("event")',
    );
  });

  it("keeps offscreen and hidden continuous motion out of the frame budget", () => {
    expect(standardRuntimeSource).toContain("IntersectionObserver");
    expect(standardRuntimeSource).toContain("animation.pause()");
    expect(standardRuntimeSource).toContain("animation.play()");
    expect(standardRuntimeSource).toContain("svg.pauseAnimations?.()");
    expect(standardRuntimeSource).toContain("svg.unpauseAnimations?.()");
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
