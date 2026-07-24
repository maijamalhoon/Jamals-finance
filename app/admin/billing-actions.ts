"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const PLAN_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const BILLING_INTERVALS = new Set(["month", "year", "one_time"]);
const CURRENCY_EXPONENTS = new Set([0, 2, 3]);

function readField(formData: FormData, name: string, maximumLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function actionRedirect(result: string): never {
  redirect(`/admin?billingAction=${encodeURIComponent(result)}#billing-operations`);
}

export async function saveBillingPlan(formData: FormData) {
  const code = readField(formData, "code", 40)?.toLowerCase() ?? null;
  const name = readField(formData, "name", 80);
  const billingInterval = readField(formData, "billingInterval", 20);
  const priceMajorValue = readField(formData, "priceMajor", 24);
  const currency = readField(formData, "currency", 3)?.toUpperCase() ?? null;
  const exponentValue = readField(formData, "currencyExponent", 1);
  const currencyExponent = exponentValue === null ? null : Number(exponentValue);
  const priceMajor = priceMajorValue === null ? null : Number(priceMajorValue);
  const isActive = formData.get("isActive") === "on";

  if (
    !code ||
    !PLAN_CODE_PATTERN.test(code) ||
    code === "free" ||
    !name ||
    !billingInterval ||
    !BILLING_INTERVALS.has(billingInterval) ||
    priceMajor === null ||
    !Number.isFinite(priceMajor) ||
    priceMajor <= 0 ||
    priceMajor > 1_000_000_000 ||
    !currency ||
    !CURRENCY_PATTERN.test(currency) ||
    currencyExponent === null ||
    !Number.isInteger(currencyExponent) ||
    !CURRENCY_EXPONENTS.has(currencyExponent)
  ) {
    actionRedirect("invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=%2Fadmin");
  }

  const { error } = await supabase.rpc("apply_billing_plan_operation", {
    p_code: code,
    p_name: name,
    p_billing_interval: billingInterval,
    p_price_major: priceMajor,
    p_currency: currency,
    p_currency_exponent: currencyExponent,
    p_is_active: isActive,
  });

  if (error) {
    if (error.code === "42501") actionRedirect("forbidden");
    if (error.code === "22023") actionRedirect("invalid");
    actionRedirect("unavailable");
  }

  revalidatePath("/admin");
  actionRedirect("saved");
}
