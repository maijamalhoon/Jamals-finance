"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { createClient } from "@/lib/supabase/client";
import {
  classifyAuthFailure,
  isSupabaseSessionCookie,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

type LoadState = "checking" | "ready" | "temporarily_unavailable";

function loginDestination(next: string, reason?: "session_expired") {
  const params = new URLSearchParams({ next });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [provider, setProvider] = useState("email");
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");

  useEffect(() => {
    async function loadUser() {
      setLoadState("checking");
      setError("");
      const destination = sanitizeInternalRedirect(
        new URLSearchParams(window.location.search).get("next"),
      );
      setSafeNext(destination);

      let userResult;

      try {
        userResult = await supabase.auth.getUser();
      } catch {
        setError("Authentication is temporarily unavailable. Please try again.");
        setLoadState("temporarily_unavailable");
        return;
      }

      const { data, error: userError } = userResult;

      if (userError) {
        const hasAuthCookies = document.cookie
          .split(";")
          .map((cookie) => cookie.trim().split("=")[0] ?? "")
          .some(isSupabaseSessionCookie);
        const failure = classifyAuthFailure(userError, hasAuthCookies);

        if (failure === "transient_failure") {
          setError("Authentication is temporarily unavailable. Please try again.");
          setLoadState("temporarily_unavailable");
        } else {
          router.replace(
            loginDestination(
              destination,
              failure === "stale_session" ? "session_expired" : undefined,
            ),
          );
        }
        return;
      }

      if (!data.user) {
        router.replace(loginDestination(destination));
        return;
      }

      const user = data.user;

      setUserId(user.id);
      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string) ?? "");
      setProvider((user.app_metadata?.provider as string) ?? "email");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, age, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("We could not load your profile right now. Please try again.");
        setLoadState("temporarily_unavailable");
        return;
      }

      if (profile?.onboarding_completed) {
        router.replace(destination);
        return;
      }

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.age) setAge(String(profile.age));

      setLoadState("ready");
    }

    loadUser();
  }, [retryCount, router, supabase]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const numericAge = Number(age);

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (
      !age ||
      Number.isNaN(numericAge) ||
      numericAge < 10 ||
      numericAge > 120
    ) {
      setError("Enter a valid age.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName.trim(),
      age: numericAge,
      provider,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      setSaving(false);
      setError("We could not save your profile. Please try again.");
      return;
    }

    router.replace(safeNext);
    router.refresh();
  }

  if (loadState !== "ready") {
    return (
      <AuthShell
        compact
        eyebrow={loadState === "checking" ? "Session check" : "Temporary interruption"}
        title={loadState === "checking" ? "Preparing onboarding" : "Profile setup could not load"}
        description={
          loadState === "checking"
            ? "We are confirming your current session before showing profile fields."
            : "The temporary failure is retryable. Your profile has not been marked complete."
        }
        icon={loadState === "checking" ? LoaderCircle : AlertTriangle}
      >
        {loadState === "checking" ? (
          <InlineNotice tone="info" aria-live="polite" className="flex items-center gap-3">
            <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
            Checking your session...
          </InlineNotice>
        ) : (
          <div className="space-y-4">
            <InlineNotice tone="warning" role="alert">
              {error}
            </InlineNotice>
            <Button
              type="button"
              onClick={() => setRetryCount((value) => value + 1)}
              className="w-full"
            >
              Try again <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Profile setup · Step 1 of 1"
      title="Complete your profile"
      description="Add the two required details below before continuing to your finance workspace."
      icon={ShieldCheck}
    >
      <form onSubmit={handleSubmit} aria-busy={saving} className="space-y-4">
        <div>
          <label htmlFor="onboarding-full-name" className="field-label">Full name</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
            <input
              id="onboarding-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "onboarding-error" : undefined}
              className="field-input min-h-12 pl-11 text-[15px] font-medium"
            />
          </div>
        </div>

        <div>
          <label htmlFor="onboarding-age" className="field-label">Age</label>
          <input
            id="onboarding-age"
            value={age}
            onChange={(event) =>
              setAge(event.target.value.replace(/\D/g, "").slice(0, 3))
            }
            placeholder="Enter your age"
            inputMode="numeric"
            autoComplete="off"
            disabled={saving}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "onboarding-error" : "onboarding-age-help"}
            className="field-input min-h-12 text-[15px] font-medium"
          />
          <p id="onboarding-age-help" className="mt-1.5 text-xs leading-5 text-text-tertiary">
            Enter a whole number between 10 and 120.
          </p>
        </div>

        {error ? (
          <InlineNotice id="onboarding-error" tone="danger" role="alert">
            {error}
          </InlineNotice>
        ) : null}

        <Button
          type="submit"
          loading={saving}
          loadingLabel="Saving profile..."
          className="w-full"
        >
          Continue to dashboard <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-text-tertiary">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          <span>Your profile is saved only after this form succeeds.</span>
        </div>
      </form>
    </AuthShell>
  );
}
