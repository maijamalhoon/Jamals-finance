import "server-only";

import { cookies } from "next/headers";

import {
  ANIMATION_COOKIE_KEY,
  normalizeAnimationMode,
  type AnimationMode,
} from "@/lib/animation-preference";

export async function getServerAnimationMode(): Promise<AnimationMode> {
  const cookieStore = await cookies();
  return normalizeAnimationMode(cookieStore.get(ANIMATION_COOKIE_KEY)?.value);
}
