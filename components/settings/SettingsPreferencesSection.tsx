"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import {
  useCurrency,
  type Currency,
} from "@/components/currency/CurrencyProvider";
import { createClient } from "@/lib/supabase/client";

const DATE_FORMAT_OPTIONS = [
  { value: "MMM d, yyyy", label: "Jun 22, 2026" },
  { value: "dd MMM yyyy", label: "22 Jun 2026" },
  { value: "yyyy-MM-dd", label: "2026-06-22" },
] as const;

type DateFormat = (typeof DATE_FORMAT_OPTIONS)[number]["value"];

type SettingsPreferencesSectionProps = {
  onPreferenceSaved?: () => void;
};

type PreferenceRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  value?: string;
  onClick: () => void;
};

const preferenceLayoutCss = `
.settings-page-polish .settings-core > div > div > section:nth-of-type(3) {
  display: none !important;
}

.settings-page-polish .settings-preferences-slot {
  grid-area: currency;
  width: 100%;
  min-width: 0;
}

.settings-page-polish .settings-preferences-slot .finance-panel {
  height: auto;
}

.settings-page-polish .settings-preferences-slot .settings-preferences-intro {
  display: flex;
  min-height: 5rem;
  width: 100%;
  align-items: center;
  gap: 0.85rem;
  padding: clamp(0.9rem, 2.4vw, 1.12rem);
}

.settings-page-polish .settings-preferences-slot .settings-preferences-divider {
  height: 1px;
  margin-left: 4.75rem;
  background: var(--border);
}

@media (min-width: 64rem) {
  .settings-page-polish .settings-preferences-slot {
    grid-column: 7 / -1;
    grid-row: 2;
  }
}

@media (max-width: 23rem) {
  .settings-page-polish .settings-preferences-slot .settings-preferences-intro {
    padding: 0.82rem;
  }

  .settings-page-polish .settings-preferences-slot .settings-preferences-divider {
    margin-left: 4.2rem;
  }
}
`;

function isDateFormat(value: string | null): value is DateFormat {
  return DATE_FORMAT_OPTIONS.some((option) => option.value === value);
}

function readStoredDateFormat(): DateFormat {
  if (typeof window === "undefined") return "MMM d, yyyy";

  const stored = window.localStorage.getItem("jamal-date-format");
  return isDateFormat(stored) ? stored : "MMM d, yyyy";
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="finance-icon-bubble h-11 w-11 shrink-0 rounded-full text-active">
      {children}
    </span>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  value,
  onClick,
}: PreferenceRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="finance-focus flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-hover focus-visible:bg-hover sm:px-5"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-text-primary">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
          {description}
        </span>
      </span>
      {value ? <span className="finance-state-pill hidden sm:inline-flex">{value}</span> : null}
      <ChevronRight size={18} className="shrink-0 text-text-secondary" />
    </button>
  );
}

export default function SettingsPreferencesSection({
  onPreferenceSaved,
}: SettingsPreferencesSectionProps) {
  const supabase = createClient();
  const { currency, rateLabel, setCurrency } = useCurrency();
  const [dateFormat, setDateFormat] = useState<DateFormat>("MMM d, yyyy");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [draftCurrency, setDraftCurrency] = useState<Currency>(currency);
  const [draftDateFormat, setDraftDateFormat] =
    useState<DateFormat>("MMM d, yyyy");
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    const storedDateFormat = readStoredDateFormat();
    setDateFormat(storedDateFormat);
    setDraftDateFormat(storedDateFormat);
  }, []);

  useEffect(() => {
    if (currencyOpen) setDraftCurrency(currency);
  }, [currency, currencyOpen]);

  useEffect(() => {
    if (dateOpen) setDraftDateFormat(readStoredDateFormat());
  }, [dateOpen]);

  async function handleCurrencySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingCurrency) return;

    setSavingCurrency(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSavingCurrency(false);
      toast.error("Your account could not be verified. Please sign in again.");
      return;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        preferred_currency: draftCurrency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    setSavingCurrency(false);

    if (error) {
      toast.error("Currency could not be saved to your account. Please try again.");
      return;
    }

    setCurrency(draftCurrency);
    setCurrencyOpen(false);
    toast.success(`Currency set to ${draftCurrency} for your account.`);
    onPreferenceSaved?.();
  }

  function handleDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("jamal-date-format", draftDateFormat);
    window.dispatchEvent(
      new CustomEvent("jamal-date-format-change", {
        detail: { dateFormat: draftDateFormat },
      }),
    );
    setDateFormat(draftDateFormat);
    setDateOpen(false);
    toast.success("Date format updated.");
    onPreferenceSaved?.();
  }

  const dateFormatLabel =
    DATE_FORMAT_OPTIONS.find((option) => option.value === dateFormat)?.label ??
    dateFormat;

  return (
    <div className="settings-preferences-slot">
      <style>{preferenceLayoutCss}</style>

      <section aria-labelledby="settings-preferences-title">
        <div className="finance-panel min-w-0 overflow-hidden">
          <div className="settings-preferences-intro">
            <IconBubble>
              <SlidersHorizontal size={21} aria-hidden="true" />
            </IconBubble>
            <span className="min-w-0 flex-1">
              <span
                id="settings-preferences-title"
                className="block text-[15px] font-semibold leading-5 text-text-primary"
              >
                Preferences
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-text-secondary">
                Currency follows your account; date format stays on this device
              </span>
            </span>
          </div>

          <div className="settings-preferences-divider" />

          <PreferenceRow
            icon={
              <IconBubble>
                <CircleDollarSign size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="Currency"
            description="Choose the default currency for this account on every device"
            value={currency}
            onClick={() => setCurrencyOpen(true)}
          />

          <div className="settings-preferences-divider" />

          <PreferenceRow
            icon={
              <IconBubble>
                <CalendarDays size={21} aria-hidden="true" />
              </IconBubble>
            }
            title="Date format"
            description="Choose how dates appear across the app"
            value={dateFormatLabel}
            onClick={() => setDateOpen(true)}
          />
        </div>
      </section>

      <Dialog
        open={currencyOpen}
        onOpenChange={(nextOpen) => {
          if (!savingCurrency) setCurrencyOpen(nextOpen);
        }}
      >
        <DialogContent className={financeModalContentClass}>
          <form
            onSubmit={handleCurrencySubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FinanceModalHeader
              title="Currency"
              description="This becomes your account default on every device."
              icon={CircleDollarSign}
              tone="success"
            />
            <FinanceModalBody>
              <FinanceFormField
                label="Currency"
                htmlFor="settings-currency-select"
                hint={rateLabel}
              >
                <Select
                  value={draftCurrency}
                  onValueChange={(value) => setDraftCurrency(value as Currency)}
                  disabled={savingCurrency}
                >
                  <SelectTrigger
                    id="settings-currency-select"
                    aria-label="Currency"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                    <SelectItem value="PKR">PKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </FinanceFormField>
            </FinanceModalBody>
            <FinanceModalFooter>
              <Button
                type="submit"
                size="lg"
                disabled={savingCurrency}
                className="min-h-[var(--oneui-control-height-lg)] w-full"
              >
                {savingCurrency ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {savingCurrency ? "Saving..." : "Set Currency"}
              </Button>
            </FinanceModalFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dateOpen} onOpenChange={setDateOpen}>
        <DialogContent className={financeModalContentClass}>
          <form
            onSubmit={handleDateSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <FinanceModalHeader
              title="Date format"
              description="Choose how dates appear across the app."
              icon={CalendarDays}
              tone="info"
            />
            <FinanceModalBody>
              <FinanceFormField
                label="Date format"
                htmlFor="settings-date-format-select"
              >
                <Select
                  value={draftDateFormat}
                  onValueChange={(value) =>
                    setDraftDateFormat(value as DateFormat)
                  }
                >
                  <SelectTrigger
                    id="settings-date-format-select"
                    aria-label="Date format"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" sideOffset={8} className="z-[90] p-1.5">
                    {DATE_FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FinanceFormField>
            </FinanceModalBody>
            <FinanceModalFooter>
              <Button
                type="submit"
                size="lg"
                className="min-h-[var(--oneui-control-height-lg)] w-full"
              >
                <Save size={16} aria-hidden="true" />
                Set Date
              </Button>
            </FinanceModalFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
