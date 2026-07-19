import { describe, expect, it } from "vitest";

import {
  applyOverscrollImpulse,
  canConsumeVerticalScroll,
  classifyOverscrollInput,
  getOverscrollMotionProfile,
  isOverscrollSpringSettled,
  normalizeWheelDelta,
  resolveOverscrollDirection,
  stepOverscrollSpring,
} from "./overscroll-bounce";

describe("overscroll bounce behavior", () => {
  it("normalizes pixel, line, and page wheel input", () => {
    expect(normalizeWheelDelta(12, 0, 900)).toBe(12);
    expect(normalizeWheelDelta(3, 1, 900)).toBe(48);
    expect(normalizeWheelDelta(1, 2, 900)).toBe(900);
    expect(normalizeWheelDelta(Number.NaN, 0, 900)).toBe(0);
  });

  it("distinguishes trackpad movement from wheel notches", () => {
    expect(classifyOverscrollInput(18, 0)).toBe("trackpad");
    expect(classifyOverscrollInput(100, 0)).toBe("wheel");
    expect(classifyOverscrollInput(48, 1)).toBe("wheel");
  });

  it("only activates beyond the correct scroll edge", () => {
    const base = { scrollHeight: 1200, clientHeight: 600 };

    expect(
      resolveOverscrollDirection({ ...base, scrollTop: 0, deltaY: -24 }),
    ).toBe(1);
    expect(
      resolveOverscrollDirection({ ...base, scrollTop: 600, deltaY: 24 }),
    ).toBe(-1);
    expect(
      resolveOverscrollDirection({ ...base, scrollTop: 300, deltaY: 24 }),
    ).toBe(0);
    expect(
      resolveOverscrollDirection({ ...base, scrollTop: 0, deltaY: 24 }),
    ).toBe(0);
  });

  it("supports both directions on pages shorter than the viewport", () => {
    const shortPage = {
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 700,
    };

    expect(resolveOverscrollDirection({ ...shortPage, deltaY: -20 })).toBe(1);
    expect(resolveOverscrollDirection({ ...shortPage, deltaY: 20 })).toBe(-1);
  });

  it("lets nested scroll areas consume input until their own edge", () => {
    const metrics = {
      scrollHeight: 900,
      clientHeight: 300,
    };

    expect(
      canConsumeVerticalScroll({ ...metrics, scrollTop: 200, deltaY: 20 }),
    ).toBe(true);
    expect(
      canConsumeVerticalScroll({ ...metrics, scrollTop: 600, deltaY: 20 }),
    ).toBe(false);
    expect(
      canConsumeVerticalScroll({ ...metrics, scrollTop: 0, deltaY: -20 }),
    ).toBe(false);
  });

  it("scales the pull distance by viewport without becoming excessive", () => {
    const compact = getOverscrollMotionProfile(900, "wheel");
    const desktop = getOverscrollMotionProfile(1440, "wheel");
    const large = getOverscrollMotionProfile(2560, "wheel");

    expect(compact.maxOffset).toBeLessThan(desktop.maxOffset);
    expect(desktop.maxOffset).toBeLessThan(large.maxOffset);
    expect(large.maxOffset).toBeLessThanOrEqual(46);
  });

  it("applies resistance and never exceeds the configured limit", () => {
    const profile = getOverscrollMotionProfile(1440, "wheel");
    let target = 0;

    for (let index = 0; index < 30; index += 1) {
      target = applyOverscrollImpulse(target, 120, 1, profile);
    }

    expect(target).toBeGreaterThan(0);
    expect(target).toBeLessThanOrEqual(profile.maxOffset);
  });

  it("settles smoothly back to rest after release", () => {
    const profile = getOverscrollMotionProfile(1440, "trackpad");
    let state = { offset: 32, velocity: 0 };

    for (let frame = 0; frame < 180; frame += 1) {
      state = stepOverscrollSpring(state, 0, 1000 / 60, profile, true);
      if (isOverscrollSpringSettled(state)) break;
    }

    expect(Math.abs(state.offset)).toBeLessThan(0.08);
    expect(Math.abs(state.velocity)).toBeLessThan(0.08);
  });
});
