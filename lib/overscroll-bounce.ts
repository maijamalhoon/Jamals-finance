export type OverscrollInputKind = "trackpad" | "wheel";

export type OverscrollMotionProfile = {
  maxOffset: number;
  maxImpulse: number;
  gain: number;
  releaseDelay: number;
  pullSpring: number;
  pullDamping: number;
  releaseSpring: number;
  releaseDamping: number;
};

export type OverscrollSpringState = {
  offset: number;
  velocity: number;
};

const FRAME_DURATION = 1000 / 60;
const DEFAULT_EDGE_EPSILON = 1.5;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number,
  viewportHeight: number,
) {
  if (!Number.isFinite(deltaY)) return 0;
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * Math.max(1, viewportHeight);
  return deltaY;
}

export function classifyOverscrollInput(
  normalizedDelta: number,
  deltaMode: number,
): OverscrollInputKind {
  if (deltaMode !== 0) return "wheel";
  return Math.abs(normalizedDelta) <= 48 ? "trackpad" : "wheel";
}

export function getOverscrollMotionProfile(
  viewportWidth: number,
  inputKind: OverscrollInputKind,
): OverscrollMotionProfile {
  const safeWidth = Number.isFinite(viewportWidth)
    ? Math.max(0, viewportWidth)
    : 1440;

  const maxOffset =
    safeWidth < 1024 ? 26 : safeWidth < 1440 ? 34 : safeWidth < 1920 ? 40 : 46;

  const isTrackpad = inputKind === "trackpad";

  return {
    maxOffset,
    maxImpulse: isTrackpad ? 46 : 120,
    gain: isTrackpad ? 0.11 : 0.12,
    releaseDelay: isTrackpad ? 90 : 140,
    pullSpring: 0.24,
    pullDamping: 0.68,
    releaseSpring: 0.16,
    releaseDamping: 0.72,
  };
}

export function resolveOverscrollDirection({
  scrollTop,
  scrollHeight,
  clientHeight,
  deltaY,
  epsilon = DEFAULT_EDGE_EPSILON,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  deltaY: number;
  epsilon?: number;
}) {
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 0.01) return 0;

  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  const safeScrollTop = clamp(scrollTop, 0, maxScroll);
  const atTop = safeScrollTop <= epsilon;
  const atBottom = maxScroll <= epsilon || safeScrollTop >= maxScroll - epsilon;

  if (deltaY < 0 && atTop) return 1;
  if (deltaY > 0 && atBottom) return -1;
  return 0;
}

export function canConsumeVerticalScroll({
  scrollTop,
  scrollHeight,
  clientHeight,
  deltaY,
  epsilon = DEFAULT_EDGE_EPSILON,
}: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  deltaY: number;
  epsilon?: number;
}) {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll <= epsilon) return false;

  if (deltaY < 0) return scrollTop > epsilon;
  if (deltaY > 0) return scrollTop < maxScroll - epsilon;
  return false;
}

export function applyOverscrollImpulse(
  currentTarget: number,
  normalizedDelta: number,
  direction: number,
  profile: OverscrollMotionProfile,
) {
  if (direction !== 1 && direction !== -1) return currentTarget;

  const magnitude = Math.min(
    Math.abs(normalizedDelta),
    profile.maxImpulse,
  );
  const saturation = clamp(
    Math.abs(currentTarget) / Math.max(1, profile.maxOffset),
    0,
    1,
  );
  const resistance = 0.18 + 0.82 * Math.pow(1 - saturation, 1.6);
  const nextTarget =
    currentTarget + direction * magnitude * profile.gain * resistance;

  return clamp(nextTarget, -profile.maxOffset, profile.maxOffset);
}

export function stepOverscrollSpring(
  state: OverscrollSpringState,
  targetOffset: number,
  elapsedMs: number,
  profile: OverscrollMotionProfile,
  releasing: boolean,
): OverscrollSpringState {
  const frameScale = clamp(elapsedMs / FRAME_DURATION, 0.25, 2);
  const spring = releasing ? profile.releaseSpring : profile.pullSpring;
  const damping = releasing ? profile.releaseDamping : profile.pullDamping;
  const acceleration = (targetOffset - state.offset) * spring;
  const velocity =
    (state.velocity + acceleration * frameScale) *
    Math.pow(damping, frameScale);
  const offset = state.offset + velocity * frameScale;

  return {
    offset: clamp(offset, -profile.maxOffset, profile.maxOffset),
    velocity,
  };
}

export function isOverscrollSpringSettled(
  state: OverscrollSpringState,
  targetOffset = 0,
) {
  return (
    Math.abs(state.offset - targetOffset) < 0.08 &&
    Math.abs(state.velocity) < 0.08
  );
}
