"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LoaderCircle, Sparkles, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
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
      setError("Apna full name enter karo.");
      return;
    }

    if (
      !age ||
      Number.isNaN(numericAge) ||
      numericAge < 10 ||
      numericAge > 120
    ) {
      setError("Valid age enter karo.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName.trim(),
      age: numericAge,
      provider: "google",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      setSaving(false);
      setError("Profile save nahi ho saka. Dobara try karo.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f5f7fb] px-4 dark:bg-[#050816]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-blue-500 to-violet-500">
            <LoaderCircle className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="font-semibold text-slate-950 dark:text-white">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#eef3fb] px-3 py-6 text-slate-950 dark:bg-[#070b14] dark:text-white">
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10" />
      <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/10" />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-[390px] rounded-[28px] border border-white/70 bg-white/90 p-6 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 dark:text-white"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.04em]">
            Complete your profile
          </h1>

          <p className="mt-3 max-w-[310px] text-[15px] leading-6 text-slate-600 dark:text-slate-400">
            Add your name and age to prepare your Jamals Finance dashboard.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Full name
            </span>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your name"
                className="h-12 w-full rounded-[22px] border border-slate-200 bg-white/80 px-11 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Age
            </span>
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={age}
                onChange={(event) =>
                  setAge(event.target.value.replace(/\D/g, "").slice(0, 3))
                }
                placeholder="Enter your age"
                inputMode="numeric"
                className="h-12 w-full rounded-[22px] border border-slate-200 bg-white/80 px-11 text-sm outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-400 dark:focus:ring-blue-500/15"
              />
            </div>
          </label>

          {error ?
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
              {error}
            </p>
          : null}

          <button
            type="submit"
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition active:scale-[0.98] disabled:opacity-70 dark:bg-white dark:text-slate-950"
          >
            {saving ?
              <LoaderCircle className="h-4 w-4 animate-spin" />
            : null}
            Continue to dashboard
          </button>
        </div>
      </motion.form>
    </main>
  );
}
