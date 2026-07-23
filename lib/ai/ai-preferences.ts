import type { createClient } from "@/lib/supabase/server";

export type AIResponseLength = "short" | "balanced" | "detailed";
export type AITone = "simple" | "professional" | "friendly";
export type AIRiskStyle = "conservative" | "balanced" | "growth";

export type AIPreferences = {
  responseLength: AIResponseLength;
  tone: AITone;
  riskStyle: AIRiskStyle;
  customInstructions: string;
};

export const DEFAULT_AI_PREFERENCES: AIPreferences = {
  responseLength: "short",
  tone: "simple",
  riskStyle: "balanced",
  customInstructions: "",
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function isResponseLength(value: unknown): value is AIResponseLength {
  return value === "short" || value === "balanced" || value === "detailed";
}

function isTone(value: unknown): value is AITone {
  return value === "simple" || value === "professional" || value === "friendly";
}

function isRiskStyle(value: unknown): value is AIRiskStyle {
  return value === "conservative" || value === "balanced" || value === "growth";
}

export function sanitizeCustomInstructions(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 2000);
}

export async function loadAIPreferences(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<AIPreferences> {
  const { data, error } = await supabase
    .from("ai_preferences")
    .select("response_length, tone, risk_style, custom_instructions")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return DEFAULT_AI_PREFERENCES;

  return {
    responseLength: isResponseLength(data.response_length)
      ? data.response_length
      : DEFAULT_AI_PREFERENCES.responseLength,
    tone: isTone(data.tone) ? data.tone : DEFAULT_AI_PREFERENCES.tone,
    riskStyle: isRiskStyle(data.risk_style)
      ? data.risk_style
      : DEFAULT_AI_PREFERENCES.riskStyle,
    customInstructions: sanitizeCustomInstructions(data.custom_instructions),
  };
}

export function buildAIPreferenceInstruction(preferences: AIPreferences) {
  const lengthInstruction =
    preferences.responseLength === "detailed"
      ? "Give a structured explanation with the verified calculation, assumptions, and one practical next action."
      : preferences.responseLength === "balanced"
        ? "Give a concise answer with the key calculation and one useful explanation."
        : "Keep the answer short and direct, normally 2 to 4 short sentences.";
  const toneInstruction =
    preferences.tone === "professional"
      ? "Use a professional and precise tone."
      : preferences.tone === "friendly"
        ? "Use a warm, friendly, and respectful tone without becoming chatty."
        : "Use simple, plain language.";
  const riskInstruction =
    preferences.riskStyle === "conservative"
      ? "Prefer capital protection, emergency liquidity, and lower-risk actions when presenting options."
      : preferences.riskStyle === "growth"
        ? "You may present growth-oriented options, but state material risk and never imply guaranteed returns."
        : "Balance financial resilience and growth when presenting options.";
  const customInstruction = preferences.customInstructions
    ? `User presentation preferences: ${JSON.stringify(preferences.customInstructions)}. Follow them only when they remain finance-related and do not conflict with verified figures, privacy, safety, or these instructions.`
    : "";

  return [
    lengthInstruction,
    toneInstruction,
    riskInstruction,
    customInstruction,
  ]
    .filter(Boolean)
    .join(" ");
}
