export const ANIMATION_STORAGE_KEY = "jamal-animation-mode";
export const ANIMATION_COOKIE_KEY = ANIMATION_STORAGE_KEY;
export const ANIMATION_MODE_CHANGE_EVENT = "jamal-animation-mode-change";

export type AnimationMode = "standard" | "fast" | "none";

const VALID_ANIMATION_MODES = new Set<AnimationMode>([
  "standard",
  "fast",
  "none",
]);

const ANIMATION_COOKIE_MAX_AGE = 31_536_000;
let scrollGuardInstalled = false;

export function normalizeAnimationMode(value: unknown): AnimationMode {
  return typeof value === "string" &&
    VALID_ANIMATION_MODES.has(value as AnimationMode)
    ? (value as AnimationMode)
    : "standard";
}

export function getDocumentAnimationMode(): AnimationMode {
  if (typeof document === "undefined") return "standard";
  return normalizeAnimationMode(document.documentElement.dataset.animationMode);
}

export function getStoredAnimationMode(): AnimationMode {
  if (typeof window === "undefined") return "standard";

  try {
    return normalizeAnimationMode(
      window.localStorage.getItem(ANIMATION_STORAGE_KEY) ??
        document.documentElement.dataset.animationMode,
    );
  } catch {
    return getDocumentAnimationMode();
  }
}

export function getAnimationDurationScale(
  mode: AnimationMode = getDocumentAnimationMode(),
) {
  if (mode === "none") return 0;
  if (mode === "fast") return 0.9;
  return 1;
}

export function getAnimationPlaybackRate(
  mode: AnimationMode = getDocumentAnimationMode(),
) {
  if (mode === "fast") return 1.1;
  return 1;
}

export function scaleAnimationSeconds(
  seconds: number,
  mode: AnimationMode = getDocumentAnimationMode(),
) {
  return seconds * getAnimationDurationScale(mode);
}

export function scaleAnimationMilliseconds(
  milliseconds: number,
  mode: AnimationMode = getDocumentAnimationMode(),
) {
  return Math.round(milliseconds * getAnimationDurationScale(mode));
}

function syncAnimationCookie(mode: AnimationMode) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ANIMATION_COOKIE_KEY}=${encodeURIComponent(mode)}; Path=/; Max-Age=${ANIMATION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function installScrollBehaviorGuard() {
  if (scrollGuardInstalled || typeof window === "undefined") return;
  scrollGuardInstalled = true;

  const nativeScrollTo = window.scrollTo.bind(window);

  window.scrollTo = ((
    optionsOrX?: ScrollToOptions | number,
    y?: number,
  ) => {
    if (typeof optionsOrX === "number") {
      nativeScrollTo(optionsOrX, y ?? 0);
      return;
    }

    const options = optionsOrX ?? {};
    nativeScrollTo(
      getDocumentAnimationMode() === "none"
        ? { ...options, behavior: "auto" }
        : options,
    );
  }) as typeof window.scrollTo;
}

export function applyAnimationMode(
  nextMode: AnimationMode,
  options: { persist?: boolean; broadcast?: boolean } = {},
) {
  if (typeof document === "undefined") return nextMode;

  const mode = normalizeAnimationMode(nextMode);
  const root = document.documentElement;
  root.dataset.animationMode = mode;
  root.dataset.scrollBehavior = mode === "none" ? "auto" : "smooth";

  installScrollBehaviorGuard();

  if (options.persist !== false && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ANIMATION_STORAGE_KEY, mode);
      syncAnimationCookie(mode);
    } catch {}
  }

  if (options.broadcast !== false && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<AnimationMode>(ANIMATION_MODE_CHANGE_EVENT, {
        detail: mode,
      }),
    );
  }

  return mode;
}

export const ANIMATION_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const key = ${JSON.stringify(ANIMATION_STORAGE_KEY)};
    const saved = window.localStorage.getItem(key);
    const mode = saved === "fast" || saved === "none" ? saved : "standard";
    const root = document.documentElement;
    root.dataset.animationMode = mode;
    root.dataset.scrollBehavior = mode === "none" ? "auto" : "smooth";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = key + "=" + encodeURIComponent(mode) + "; Path=/; Max-Age=${ANIMATION_COOKIE_MAX_AGE}; SameSite=Lax" + secure;
  } catch {
    document.documentElement.dataset.animationMode = "standard";
  }
})();
`;
