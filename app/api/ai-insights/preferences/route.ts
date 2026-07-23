import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RESPONSE_LENGTHS = ["short", "balanced", "detailed"] as const;
const TONES = ["simple", "professional", "friendly"] as const;
const RISK_STYLES = ["conservative", "balanced", "growth"] as const;

type ResponseLength = (typeof RESPONSE_LENGTHS)[number];
type Tone = (typeof TONES)[number];
type RiskStyle = (typeof RISK_STYLES)[number];

type Preferences = {
  responseLength: ResponseLength;
  tone: Tone;
  riskStyle: RiskStyle;
  customInstructions: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  responseLength: "short",
  tone: "simple",
  riskStyle: "balanced",
  customInstructions: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function cleanInstructions(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").trim().slice(0, 2000)
    : "";
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before changing AI settings.",
      },
      401,
    );
  }

  const { data, error } = await supabase
    .from("ai_preferences")
    .select("response_length, tone, risk_style, custom_instructions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("AI preferences read failed", {
      code: error.code,
      message: error.message,
    });
    return json({
      preferences: DEFAULT_PREFERENCES,
      available: false,
    });
  }

  return json({
    preferences: data
      ? {
          responseLength: isOneOf(data.response_length, RESPONSE_LENGTHS)
            ? data.response_length
            : DEFAULT_PREFERENCES.responseLength,
          tone: isOneOf(data.tone, TONES)
            ? data.tone
            : DEFAULT_PREFERENCES.tone,
          riskStyle: isOneOf(data.risk_style, RISK_STYLES)
            ? data.risk_style
            : DEFAULT_PREFERENCES.riskStyle,
          customInstructions: cleanInstructions(data.custom_instructions),
        }
      : DEFAULT_PREFERENCES,
    available: true,
  });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return json(
      { error: "invalid_preferences", message: "AI settings are invalid." },
      400,
    );
  }

  const responseLength = isOneOf(body.responseLength, RESPONSE_LENGTHS)
    ? body.responseLength
    : null;
  const tone = isOneOf(body.tone, TONES) ? body.tone : null;
  const riskStyle = isOneOf(body.riskStyle, RISK_STYLES)
    ? body.riskStyle
    : null;
  const customInstructions = cleanInstructions(body.customInstructions);

  if (!responseLength || !tone || !riskStyle) {
    return json(
      { error: "invalid_preferences", message: "AI settings are invalid." },
      400,
    );
  }

  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return json(
      {
        error: "authentication_required",
        message: "Please log in before changing AI settings.",
      },
      401,
    );
  }

  const { error } = await supabase.from("ai_preferences").upsert(
    {
      user_id: user.id,
      response_length: responseLength,
      tone,
      risk_style: riskStyle,
      custom_instructions: customInstructions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("AI preferences save failed", {
      code: error.code,
      message: error.message,
    });
    return json(
      {
        error: "preferences_unavailable",
        message: "AI settings could not be saved. Please try again.",
      },
      503,
    );
  }

  return json({
    saved: true,
    preferences: {
      responseLength,
      tone,
      riskStyle,
      customInstructions,
    },
  });
}
