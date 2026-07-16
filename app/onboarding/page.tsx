"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  AuthFeedback,
  AuthField,
  AuthSubmitAction,
} from "@/components/auth/AuthControls";
import AuthShell from "@/components/auth/AuthShell";
import { AuthFormSkeleton } from "@/components/loading/LoadingPrimitives";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  classifyAuthFailure,
  isSupabaseSessionCookie,
  sanitizeInternalRedirect,
} from "@/lib/supabase/session";

type LoadState = "checking" | "ready" | "temporarily_unavailable";
type OnboardingField = "fullName" | "age";

function loginDestination(next: string, reason?: "session_expired") {
  const params = new URLSearchParams({ next });
  if (reason) params.set("reason", reason);
  return `/login?${params.toString()}`;
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fullNameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const saveInFlight = useRef(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [provider, setProvider] = useState("email");
  const [loadState, setLoadState] = useState<LoadState>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OnboardingField, string>>>({});
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [safeNext, setSafeNext] = useState("/dashboard");

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      setLoadState("checking");
      setLoadError("");
      const destination = sanitizeInternalRedirect(
        new URLSearchParams(window.location.search).get("next"),
      );
      setSafeNext(destination);

      let userResult;

      try {
        userResult = await supabase.auth.getUser();
      } catch {
        if (cancelled) return;
        setLoadError("Authentication is temporarily unavailable. Please try again.");
        setLoadState("temporarily_unavailable");
        return;
      }

      if (cancelled) return;
      const { data, error: userError } = userResult;

      if (userError) {
        const hasAuthCookies = document.cookie
          .split(";")
          .map((cookie) => cookie.trim().split("=")[0] ?? "")
          .some(isSupabaseSessionCookie);
        const failure = classifyAuthFailure(userError, hasAuthCookies);

        if (failure === "transient_failure") {
          setLoadError("Authentication is temporarily unavailable. Please try again.");
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

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, age, onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          setLoadError("We could not load your profile right now. Please try again.");
          setLoadState("temporarily_unavailable");
          return;
        }

        if (profile?.onboarding_completed) {
          router.replace(destination);
          return;
        }

        if (profile?.full_name) setFullName(profile.full_name);
        if (profile?.age !== null && profile?.age !== undefined) {
          setAge(String(profile.age));
        }

        setLoadState("ready");
      } catch {
        if (cancelled) return;
        setLoadError("We could not load your profile right now. Please try again.");
        setLoadState("temporarily_unavailable");
      }
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [retryCount, router, supabase]);

  function clearFieldError(field: OnboardingField) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function setFieldError(field: OnboardingField, message: string) {
    setFieldErrors((current) => ({ ...current, [field]: message }));
    (field === "fullName" ? fullNameRef : ageRef).current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saveInFlight.current || saving) return;

    setFieldErrors({});
    setFormError("");

    if (!fullName.trim()) {
      setFieldError("fullName", "Enter your full name.");
      return;
    }

    const numericAge = Number(age);
    if (
      !age ||
      !Number.isInteger(numericAge) ||
      numericAge < 10 ||
      numericAge > 120
    ) {
      setFieldError("age", "Enter a whole-number age from 10 to 120.");
      return;
    }

    saveInFlight.current = true;
    setSaving(true);

    try {
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
        saveInFlight.current = false;
        setSaving(false);
        setFormError("We could not save your profile. Please try again.");
        return;
      }

      router.replace(safeNext);
      router.refresh();
    } catch {
      saveInFlight.current = false;
      setSaving(false);
      setFormError("We could not save your profile. Please try again.");
    }
  }

  if (loadState !== "ready") {
    return (
      <AuthShell
        compact
        eyebrow={loadState === "checking" ? "Profile setup" : "Temporary interruption"}
        progress={loadState === "checking" ? "Session check" : undefined}
        title={loadState === "checking" ? "Preparing your profile" : "Profile setup could not load"}
        description={
          loadState === "checking"
            ? "We are confirming your session before showing your profile fields."
            : "This interruption is retryable, and your profile has not been marked complete."
        }
        icon={loadState === "checking" ? LoaderCircle : AlertTriangle}
      >
        {loadState === "checking" ? (
          <div className="space-y-4" aria-live="polite" aria-busy="true">
            <AuthFeedback tone="info">
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                Checking your session…
              </span>
            </AuthFeedback>
            <AuthFormSkeleton fields={2} />
          </div>
        ) : (
          <div className="space-y-4">
            <AuthFeedback tone="warning" role="alert">{loadError}</AuthFeedback>
            <Button
              type="button"
              onClick={() => setRetryCount((value) => value + 1)}
              size="lg"
              className="w-full"
            >
              Try again <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </AuthShell>
    );
  }

  const providerLabel =
    provider === "google" ? "Google"
    : provider === "email" ? "Email and password"
    : "Connected account";

  return (
    <AuthShell
      eyebrow="Profile setup"
      progress="Step 1 of 1"
      title="Complete your profile"
      description="Your name personalizes the workspace, and age keeps profile information complete."
      icon={ShieldCheck}
    >
      <dl className="auth-identity-summary" aria-label="Signed-in identity">
        <div>
          <dt><Mail className="h-4 w-4" aria-hidden="true" /> Email</dt>
          <dd>{email || "Signed-in account"}</dd>
        </div>
        <div>
          <dt><KeyRound className="h-4 w-4" aria-hidden="true" /> Sign-in method</dt>
          <dd>{providerLabel}</dd>
        </div>
      </dl>

      <form onSubmit={handleSubmit} noValidate aria-busy={saving} className="mt-4 space-y-1">
        <AuthField
          id="onboarding-full-name"
          name="full_name"
          label="Full name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            clearFieldError("fullName");
          }}
          placeholder="Enter your full name"
          autoComplete="name"
          disabled={saving}
          error={fieldErrors.fullName}
          inputRef={fullNameRef}
          icon={<UserRound className="h-4 w-4" />}
        />

        <AuthField
          id="onboarding-age"
          name="age"
          label="Age"
          value={age}
          onChange={(event) => {
            setAge(event.target.value.replace(/\D/g, "").slice(0, 3));
            clearFieldError("age");
          }}
          placeholder="Enter your age"
          inputMode="numeric"
          autoComplete="off"
          disabled={saving}
          error={fieldErrors.age}
          helper="Enter a whole number between 10 and 120."
          inputRef={ageRef}
        />

        <div className="auth-feedback-slot">
          {formError ? <AuthFeedback tone="danger">{formError}</AuthFeedback> : null}
        </div>

        <AuthSubmitAction type="submit" loading={saving} loadingLabel="Saving profile…" disabled={saving}>
          Continue to dashboard <ArrowRight className="h-4 w-4" />
        </AuthSubmitAction>

        <div className="flex items-start justify-center gap-2 pt-2 text-center text-xs leading-5 text-text-tertiary">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          <span>Your profile becomes complete only after these details save successfully.</span>
        </div>
      </form>
    </AuthShell>
  );
}
