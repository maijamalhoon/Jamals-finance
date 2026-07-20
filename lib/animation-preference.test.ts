import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ANIMATION_BOOTSTRAP_SCRIPT,
  ANIMATION_COOKIE_KEY,
  ANIMATION_MODE_CHANGE_EVENT,
  ANIMATION_STORAGE_KEY,
  applyAnimationMode,
  getAnimationDurationScale,
  getAnimationPlaybackRate,
  getDocumentAnimationMode,
  getStoredAnimationMode,
  normalizeAnimationMode,
  scaleAnimationMilliseconds,
  scaleAnimationSeconds,
} from "./animation-preference";

const animationCssSource = readFileSync(
  new URL("../app/animation-preference.css", import.meta.url),
  "utf8",
);

const motionProviderSource = readFileSync(
  new URL("../components/motion/MotionProvider.tsx", import.meta.url),
  "utf8",
);

const performanceModeSource = readFileSync(
  new URL(
    "../components/performance/NoAnimationPerformanceMode.tsx",
    import.meta.url,
  ),
  "utf8",
);

const routeLoadingSource = readFileSync(
  new URL(
    "../components/loading/AnimationAwareDashboardRouteLoading.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("animation preference contracts", () => {
  it("accepts only standard, fast, and none", () => {
    expect(normalizeAnimationMode("standard")).toBe("standard");
    expect(normalizeAnimationMode("fast")).toBe("fast");
    expect(normalizeAnimationMode("none")).toBe("none");
    expect(normalizeAnimationMode("slow")).toBe("standard");
    expect(normalizeAnimationMode(null)).toBe("standard");
  });

  it("keeps default unchanged, accelerates fast, and resolves none instantly", () => {
    expect(getAnimationDurationScale("standard")).toBe(1);
    expect(getAnimationPlaybackRate("standard")).toBe(1);

    expect(getAnimationDurationScale("fast")).toBe(0.58);
    expect(getAnimationPlaybackRate("fast")).toBe(1.7);

    expect(getAnimationDurationScale("none")).toBe(0);
    expect(getAnimationPlaybackRate("none")).toBe(1);
  });

  it("scales authored durations consistently", () => {
    expect(scaleAnimationSeconds(1, "standard")).toBe(1);
    expect(scaleAnimationSeconds(1, "fast")).toBe(0.58);
    expect(scaleAnimationSeconds(1, "none")).toBe(0);

    expect(scaleAnimationMilliseconds(220, "standard")).toBe(220);
    expect(scaleAnimationMilliseconds(220, "fast")).toBe(128);
    expect(scaleAnimationMilliseconds(220, "none")).toBe(0);
  });

  it("uses one shared storage, cookie, and broadcast contract", () => {
    expect(ANIMATION_STORAGE_KEY).toBe("jamal-animation-mode");
    expect(ANIMATION_COOKIE_KEY).toBe(ANIMATION_STORAGE_KEY);
    expect(ANIMATION_MODE_CHANGE_EVENT).toBe("jamal-animation-mode-change");

    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "window.localStorage.getItem(key)",
    );
    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "root.dataset.animationMode = mode",
    );
    expect(ANIMATION_BOOTSTRAP_SCRIPT).toContain(
      "document.cookie = key +",
    );
  });

  it("is safe during server rendering", () => {
    expect(getDocumentAnimationMode()).toBe("standard");
    expect(getStoredAnimationMode()).toBe("standard");
    expect(applyAnimationMode("fast", { persist: false })).toBe("fast");
  });

  it("keeps the three CSS modes isolated", () => {
    expect(animationCssSource).toContain(
      'html[data-animation-mode="fast"] {',
    );
    expect(animationCssSource).toContain("--motion-duration-base: 118ms;");
    expect(animationCssSource).toContain(
      'html[data-animation-mode="none"] *',
    );
    expect(animationCssSource).toContain("animation: none !important;");
    expect(animationCssSource).toContain("transition: none !important;");
    expect(animationCssSource).not.toContain(
      'html[data-animation-mode="standard"] *',
    );
  });

  it("keeps standard mode free from animation runtime observers", () => {
    expect(motionProviderSource).toContain(
      'if (mode === "standard") detachRuntimeTuning();',
    );
    expect(motionProviderSource).toContain(
      'if (activeMode === "standard") return;',
    );
    expect(motionProviderSource).toContain(
      "target.getAnimations({ subtree })",
    );
  });

  it("bounds preloading and protects constrained devices", () => {
    expect(performanceModeSource).toContain("connection?.saveData === true");
    expect(performanceModeSource).toContain("runtimeNavigator.deviceMemory");
    expect(performanceModeSource).toContain("routeLimit:");
    expect(performanceModeSource).toContain("attachIntentListeners");
    expect(performanceModeSource).toContain("detachIntentListeners");
    expect(performanceModeSource).toContain(
      'mode === "none" ? (moderateNetwork ? 2 : 5)',
    );
  });

  it("keeps loading behavior distinct for all three modes", () => {
    expect(routeLoadingSource).toContain('animationMode === "none"');
    expect(routeLoadingSource).toContain('animationMode === "fast"');
    expect(routeLoadingSource).toContain(
      "return <DashboardRouteLoading variant={variant} />;",
    );
  });
});
