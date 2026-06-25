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

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [provider, setProvider] = useState("email");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const user = data.user;

      setUserId(user.id);
      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string) ?? "");
      setProvider((user.app_metadata?.provider as string) ?? "email");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, age, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.onboarding_completed && profile.full_name && profile.age) {
        router.replace("/dashboard");
        return;
      }

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.age) setAge(String(profile.age));

      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

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

    router.replace("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[linear-gradient(135deg,#07111a_0%,#0c1724_48%,#121523_100%)] px-4 text-[#f8fbff]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-lg border border-[rgba(255,255,255,0.13)] bg-[rgba(255,255,255,0.09)]">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#bfdbfe]" />
          </div>
          <p className="font-semibold text-[#f8fbff]">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="jf-auth-page relative min-h-dvh overflow-x-hidden bg-[linear-gradient(135deg,#07111a_0%,#0c1724_48%,#121523_100%)] px-4 py-5 text-[#f8fbff] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

      <div className="relative mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-[1040px] items-center gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-8">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative hidden min-h-[560px] flex-col justify-center overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.25)] lg:flex"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22c55e,#38bdf8,#fbbf24)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] px-3.5 py-2 text-sm font-semibold text-[rgba(248,251,255,0.72)]">
              <Sparkles className="h-4 w-4 text-[#fef3c7]" />
              Jamals Finance
            </div>

            <h2 className="mt-8 max-w-[520px] text-[44px] font-semibold leading-[1.06] text-[#f8fbff]">
              One last step before your dashboard opens.
            </h2>

            <p className="mt-5 max-w-[440px] text-[16px] leading-7 text-[rgba(248,251,255,0.64)]">
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
                  className="flex items-start gap-3 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.075)] p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.09)] text-[#bfdbfe]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[#f8fbff]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[rgba(248,251,255,0.58)]">
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
          initial={{ opacity: 0, x: 18, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.085)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6 lg:mx-0"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />

          <div className="relative z-10">
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-[rgba(255,255,255,0.13)] bg-[rgba(255,255,255,0.09)] shadow-[0_16px_36px_rgba(59,130,246,0.16)]">
                <ShieldCheck className="h-6 w-6 text-[#bfdbfe]" />
              </div>

              <h1 className="text-[30px] font-semibold leading-tight text-[#f8fbff] sm:text-[34px]">
                Complete your profile
              </h1>

              <p className="mx-auto mt-3 max-w-[330px] text-[15px] leading-7 text-[rgba(248,251,255,0.62)]">
                Add your name and age to prepare your Jamals Finance dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[rgba(248,251,255,0.58)]">
                  Full name
                </span>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(248,251,255,0.46)]" />
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your name"
                    className="h-12 w-full rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.075)] px-11 text-[15px] font-medium text-[rgba(248,251,255,0.96)] outline-none transition placeholder:text-[rgba(248,251,255,0.36)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.1)] focus:border-[#8ec5ff] focus:bg-[rgba(255,255,255,0.11)] focus:ring-4 focus:ring-[rgba(96,165,250,0.18)]"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[rgba(248,251,255,0.58)]">
                  Age
                </span>
                <div className="relative">
                  <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(248,251,255,0.46)]" />
                  <input
                    value={age}
                    onChange={(event) =>
                      setAge(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="Enter your age"
                    inputMode="numeric"
                    className="h-12 w-full rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.075)] px-11 text-[15px] font-medium text-[rgba(248,251,255,0.96)] outline-none transition placeholder:text-[rgba(248,251,255,0.36)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.1)] focus:border-[#8ec5ff] focus:bg-[rgba(255,255,255,0.11)] focus:ring-4 focus:ring-[rgba(96,165,250,0.18)]"
                  />
                </div>
              </label>

              {error ? (
                <p className="rounded-lg border border-[rgba(248,113,113,0.26)] bg-[rgba(239,68,68,0.14)] px-4 py-3 text-sm font-medium leading-6 text-[#fecaca]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f8fbff] px-5 text-[15px] font-bold text-[#07101f] shadow-[0_18px_44px_rgba(216,235,255,0.16)] transition hover:bg-[#eaf5ff] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                <span>Continue to dashboard</span>
                {!saving ? (
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                ) : null}
              </button>

              <div className="flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[rgba(248,251,255,0.42)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#86efac]" />
                <span>Protected by Supabase Auth and secure sessions.</span>
              </div>
            </div>
          </div>
        </motion.form>
      </div>
    </main>
  );
}
