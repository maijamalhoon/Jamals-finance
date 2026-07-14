"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  LineChart,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
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
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 text-text-primary">
        <div className="jf-dashboard-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />
        <div className="relative flex flex-col items-center text-center">
          <div className="finance-surface mb-5 grid h-16 w-16 place-items-center rounded-[var(--oneui-card-radius)]">
            <LoaderCircle className="h-8 w-8 animate-spin text-active" />
          </div>
          {loadState === "checking" ? (
            <p aria-live="polite" className="font-semibold text-text-primary">
              Checking your session...
            </p>
          ) : (
            <div className="max-w-sm space-y-4 text-center">
              <p role="alert" className="font-semibold text-danger">{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((value) => value + 1)}
                className="finance-focus h-12 rounded-[var(--oneui-button-radius)] bg-active px-6 font-bold text-background"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="jf-auth-page relative min-h-dvh overflow-x-hidden bg-background px-4 py-5 text-text-primary sm:px-6 lg:px-8">
      <div className="jf-dashboard-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-[1040px] items-center gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-8">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="finance-surface-glass relative hidden min-h-[560px] flex-col justify-center overflow-hidden p-8 lg:flex"
        >
          <div className="jf-dashboard-grid absolute inset-0 opacity-25" />
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-[var(--oneui-control-radius)] border border-border bg-surface-secondary px-3.5 py-2 text-sm font-semibold text-text-secondary">
              <Sparkles className="h-4 w-4 text-warning" />
              Jamals Finance
            </div>

            <h2 className="mt-8 max-w-[520px] text-[44px] font-semibold leading-[1.06] text-text-primary">
              One last step before your dashboard opens.
            </h2>

            <p className="mt-5 max-w-[440px] text-[16px] leading-7 text-text-secondary">
              We use these details to personalize your profile, reports, and
              finance workspace.
            </p>

            <div className="mt-9 grid gap-3">
              {[
                {
                  icon: <ShieldCheck className="h-5 w-5" />,
                  title: "Secure profile",
                  copy: "Your profile is linked to your active Supabase session.",
                },
                {
                  icon: <WalletCards className="h-5 w-5" />,
                  title: "Personal dashboard",
                  copy: "Your name appears across account and finance views.",
                },
                {
                  icon: <LineChart className="h-5 w-5" />,
                  title: "Ready to track",
                  copy: "After this, you can start managing your finances.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-[var(--oneui-card-radius)] border border-border bg-card p-4 shadow-[var(--shadow)]"
                >
                  <div className="finance-icon-container grid h-10 w-10 shrink-0 place-items-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {item.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.aside>

        <motion.form
          onSubmit={handleSubmit}
          aria-busy={saving}
          initial={{ opacity: 0, x: 18, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="finance-surface relative mx-auto w-full max-w-[460px] overflow-hidden p-5 sm:p-6 lg:mx-0"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--active),transparent_45%),transparent)]" />

          <div className="relative z-10">
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="finance-icon-container mx-auto mb-4 grid h-12 w-12 place-items-center" data-size="lg">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h1 className="text-[30px] font-semibold leading-tight text-text-primary sm:text-[34px]">
                Complete your profile
              </h1>

              <p className="mx-auto mt-3 max-w-[330px] text-[15px] leading-7 text-text-secondary">
                Add your name and age to prepare your Jamals Finance dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="field-label">
                  Full name
                </span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your name"
                    disabled={saving}
                    className="field-input h-12 px-11 text-[15px] font-medium"
                  />
                </div>
              </label>

              <label className="block">
                <span className="field-label">
                  Age
                </span>
                <div className="relative">
                  <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    value={age}
                    onChange={(event) =>
                      setAge(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="Enter your age"
                    inputMode="numeric"
                    disabled={saving}
                    className="field-input h-12 px-11 text-[15px] font-medium"
                  />
                </div>
              </label>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[var(--oneui-control-radius)] border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-medium leading-6 text-danger"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="finance-focus group flex h-12 w-full items-center justify-center gap-2 rounded-[var(--oneui-button-radius)] bg-active px-5 text-[15px] font-bold text-background shadow-[0_18px_44px_color-mix(in_srgb,var(--active),transparent_72%)] transition hover:brightness-105 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                <span>Continue to dashboard</span>
                {!saving ? (
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                ) : null}
              </button>

              <div className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>Protected by Supabase Auth and secure sessions.</span>
              </div>
            </div>
          </div>
        </motion.form>
      </div>
    </main>
  );
}
