"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContactRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const SUPPORTED_CURRENCIES = ["PKR", "USD", "INR", "EUR", "GBP", "JPY", "CNY"] as const;

type CreateBusinessContactFormProps = {
  businessId: string;
  baseCurrency: string;
};

export default function CreateBusinessContactForm({
  businessId,
  baseCurrency,
}: CreateBusinessContactFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [contactType, setContactType] = useState("customer");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [creditLimit, setCreditLimit] = useState("0");
  const [paymentTermsDays, setPaymentTermsDays] = useState("0");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const cleanName = displayName.trim();
    const parsedCreditLimit = Number(creditLimit || 0);
    const parsedTerms = Number(paymentTermsDays || 0);

    if (cleanName.length < 2) {
      toast.error("Enter a customer or supplier name.");
      return;
    }

    if (!Number.isFinite(parsedCreditLimit) || parsedCreditLimit < 0) {
      toast.error("Credit limit must be zero or a positive amount.");
      return;
    }

    if (!Number.isInteger(parsedTerms) || parsedTerms < 0 || parsedTerms > 3650) {
      toast.error("Payment terms must be a whole number from 0 to 3650 days.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("upsert_business_contact", {
      p_business_id: businessId,
      p_contact_type: contactType,
      p_display_name: cleanName,
      p_legal_name: legalName.trim() || null,
      p_email: email.trim() || null,
      p_phone: phone.trim() || null,
      p_tax_id: taxId.trim() || null,
      p_currency: currency,
      p_credit_limit: parsedCreditLimit,
      p_payment_terms_days: parsedTerms,
      p_billing_address: {
        line1: addressLine.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
      },
      p_shipping_address: {},
      p_notes: notes.trim() || null,
      p_contact_id: null,
    });
    setSaving(false);

    if (error) {
      console.error("Business contact creation failed", { code: error.code });
      toast.error("Contact could not be saved. No record was changed.");
      return;
    }

    setDisplayName("");
    setLegalName("");
    setEmail("");
    setPhone("");
    setTaxId("");
    setCreditLimit("0");
    setPaymentTermsDays("0");
    setAddressLine("");
    setCity("");
    setCountry("");
    setNotes("");
    toast.success("Contact saved.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
          <ContactRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-black text-text-primary sm:text-lg">Add a business contact</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Customers and suppliers stay inside this company tenant and can later power invoices,
            purchases, statements, and CRM.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Contact type</span>
            <select
              value={contactType}
              onChange={(event) => setContactType(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="both">Customer and supplier</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-1 xl:col-span-2">
            <span className="text-sm font-bold text-text-primary">Display name</span>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Example: Al Noor Traders"
              maxLength={160}
              autoComplete="organization"
              disabled={saving}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Legal name</span>
            <Input
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              placeholder="Optional registered name"
              maxLength={200}
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="accounts@example.com"
              maxLength={320}
              autoComplete="email"
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Phone</span>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+92..."
              maxLength={40}
              autoComplete="tel"
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Tax or registration ID</span>
            <Input
              value={taxId}
              onChange={(event) => setTaxId(event.target.value)}
              placeholder="Optional"
              maxLength={80}
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Contact currency</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="field-input min-h-11 w-full"
              disabled={saving}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Credit limit</span>
            <Input
              value={creditLimit}
              onChange={(event) => setCreditLimit(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Payment terms</span>
            <div className="relative">
              <Input
                value={paymentTermsDays}
                onChange={(event) => setPaymentTermsDays(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className="pr-14"
                disabled={saving}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-text-tertiary">
                days
              </span>
            </div>
          </label>

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-sm font-bold text-text-primary">Billing address</span>
            <Input
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Street, building, or area"
              maxLength={240}
              autoComplete="street-address"
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">City</span>
            <Input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Karachi"
              maxLength={100}
              autoComplete="address-level2"
              disabled={saving}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Country</span>
            <Input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Pakistan"
              maxLength={100}
              autoComplete="country-name"
              disabled={saving}
            />
          </label>

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-sm font-bold text-text-primary">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional internal notes"
              maxLength={1000}
              disabled={saving}
              className="field-input min-h-24 w-full resize-y py-3"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            Database RPC validates tenant, role, currency, limits, and address structure.
          </span>
          <Button type="submit" loading={saving} loadingLabel="Saving contact..." className="sm:w-auto">
            <ContactRound aria-hidden="true" />
            Save contact
          </Button>
        </div>
      </form>
    </section>
  );
}
