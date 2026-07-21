"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Globe2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const BUSINESS_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "restaurant", label: "Restaurant / Food" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "construction", label: "Construction" },
  { value: "professional_services", label: "Professional services" },
  { value: "other", label: "Other" },
] as const;

const BASE_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;

export default function CreateBusinessWorkspaceForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("retail");
  const [countryCode, setCountryCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("PKR");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const cleanName = name.trim();
    const cleanCountry = countryCode.trim().toUpperCase();

    if (cleanName.length < 2 || cleanName.length > 120) {
      toast.error("Business name must contain 2 to 120 characters.");
      return;
    }

    if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
      toast.error("Use a two-letter country code, for example PK, US, or AE.");
      return;
    }

    setSaving(true);

    try {
      const { data: businessId, error } = await supabase.rpc(
        "create_business_workspace",
        {
          p_name: cleanName,
          p_business_type: businessType,
          p_country_code: cleanCountry || null,
          p_base_currency: baseCurrency,
          p_timezone: timezone,
        },
      );

      if (error || typeof businessId !== "string") {
        console.error("Business workspace creation failed", { code: error?.code });
        toast.error("Business workspace could not be created. Please try again.");
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("slug")
        .eq("id", businessId)
        .single();

      if (businessError || !business?.slug) {
        console.error("Created business could not be resolved", {
          code: businessError?.code,
        });
        toast.success("Business workspace created.");
        router.replace("/business");
        router.refresh();
        return;
      }

      setName("");
      toast.success("Business workspace created with its accounting foundation.");
      router.replace(`/business/${business.slug}`);
      router.refresh();
    } catch {
      toast.error("Business workspace could not be created. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-text-primary sm:text-lg">
            Create a business workspace
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
            Your company receives an isolated tenant, fiscal period, standard chart of accounts,
            roles, currency, and modules selected from its nature of business.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Business name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Jamal Traders"
              autoComplete="organization"
              maxLength={120}
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Nature of business</span>
            <select
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {BUSINESS_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Base currency</span>
            <select
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {BASE_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Country code</span>
            <Input
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              placeholder="PK"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={2}
              disabled={saving}
            />
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-bold text-text-primary">Timezone</span>
            <Input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Karachi"
              autoComplete="off"
              maxLength={80}
              disabled={saving}
              required
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Tenant-isolated data and accounting
          </span>
          <span className="flex items-center gap-2">
            <Globe2 aria-hidden="true" className="size-4 text-primary" />
            Global currency and timezone foundation
          </span>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={saving}
          loadingLabel="Creating workspace..."
          className="w-full sm:w-auto"
        >
          <Building2 aria-hidden="true" />
          Create business workspace
        </Button>
      </form>
    </section>
  );
}
