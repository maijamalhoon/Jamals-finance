"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  FinanceFormField,
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { Input } from "@/components/ui/input";
import {
  BASE_CURRENCY,
  convertMoney,
  getCurrencyFractionDigits,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import {
  calculateInvestmentWithdrawal,
  type InvestmentCurrency,
} from "@/lib/investments/accounting";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";

import type { ExistingInvestment } from "./InvestmentModal";

const INVESTMENT_ACTION_COLOR = "#6849B8";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
  icon_key?: string | null;
};

function parseFinite(value: string | number | null | undefined) {
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatInputNumber(value: number, currency: SupportedCurrency) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const standardDigits = getCurrencyFractionDigits(currency);
  const digits =
    currency === "JPY"
      ? 0
      : value >= 1
        ? Math.max(standardDigits, 4)
        : 8;

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatPurchaseDate(value: string | null | undefined) {
  if (!value) return "Purchase";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getLotLabel(lot: ExistingInvestment) {
  const quantity = parseFinite(lot.quantity) ?? 0;
  return `${formatPurchaseDate(lot.purchased_at)} · ${quantity.toLocaleString("en-US", {
    maximumFractionDigits: quantity >= 1 ? 4 : 8,
  })} ${lot.symbol?.toUpperCase() || "units"}`;
}

export default function InvestmentCashOutModal({
  open,
  lots,
  onClose,
  onSuccess,
}: {
  open: boolean;
  lots: ExistingInvestment[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const {
    currency: displayCurrency,
    rates,
    ratesReady,
    getRate,
    formatCurrency,
  } = useCurrency();

  const [lotId, setLotId] = useState("");
  const [amount, setAmount] = useState("");
  const [maximumSelected, setMaximumSelected] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedLot = useMemo(
    () => lots.find((lot) => lot.id === lotId) ?? lots[0] ?? null,
    [lotId, lots],
  );

  useEffect(() => {
    if (!open) return;
    const nextLotId = lots[0]?.id ?? "";
    setLotId(nextLotId);
    setAmount("");
    setMaximumSelected(false);
    setError("");
  }, [displayCurrency, lots, open]);

  useEffect(() => {
    if (!open || !selectedLot) return;

    let cancelled = false;

    async function loadAccounts() {
      setLoadingOptions(true);

      const accountsRequest = supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");

      const linkedTransactionRequest = supabase
        .from("transactions")
        .select("account_id")
        .eq("investment_id", selectedLot.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const [{ data: accountRows, error: accountsError }, linkedTransaction] =
        await Promise.all([accountsRequest, linkedTransactionRequest]);

      if (cancelled) return;
      setLoadingOptions(false);

      if (accountsError) {
        setAccounts([]);
        setAccountId("");
        setError("Accounts could not be loaded. Check your connection and try again.");
        return;
      }

      const nextAccounts = (accountRows ?? []) as Account[];
      const linkedAccountId =
        linkedTransaction.data &&
        typeof linkedTransaction.data.account_id === "string"
          ? linkedTransaction.data.account_id
          : "";

      setAccounts(nextAccounts);
      setAccountId(
        nextAccounts.some((account) => account.id === linkedAccountId)
          ? linkedAccountId
          : (nextAccounts[0]?.id ?? ""),
      );
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [open, selectedLot, supabase]);

  const withdrawalCurrency = displayCurrency as InvestmentCurrency;
  const availableQuantity = parseFinite(selectedLot?.quantity) ?? 0;
  const canonicalCurrentPrice = parseFinite(selectedLot?.current_price) ?? 0;
  const originalCurrentPrice = parseFinite(selectedLot?.current_price_original);
  const originalCurrentCurrency = isSupportedCurrency(
    selectedLot?.current_price_currency,
  )
    ? selectedLot?.current_price_currency
    : null;
  const currentPriceInDisplayCurrency =
    originalCurrentPrice !== null && originalCurrentCurrency === displayCurrency
      ? originalCurrentPrice
      : convertMoney(
          canonicalCurrentPrice,
          BASE_CURRENCY,
          displayCurrency,
          rates,
        );
  const maximumAmount =
    Number.isFinite(currentPriceInDisplayCurrency) && currentPriceInDisplayCurrency > 0
      ? currentPriceInDisplayCurrency * availableQuantity
      : 0;
  const amountTolerance = displayCurrency === "JPY" ? 0.5 : 0.005;
  const parsedAmount = parseFinite(amount);
  const rawQuantity =
    parsedAmount !== null &&
    parsedAmount > 0 &&
    currentPriceInDisplayCurrency > 0
      ? parsedAmount / currentPriceInDisplayCurrency
      : null;
  const quantityToWithdraw =
    maximumSelected ||
    (rawQuantity !== null &&
      maximumAmount > 0 &&
      Math.abs((parsedAmount ?? 0) - maximumAmount) <= amountTolerance)
      ? availableQuantity
      : rawQuantity;
  const withdrawalRate = getRate(displayCurrency, BASE_CURRENCY);
  const preview = selectedLot
    ? calculateInvestmentWithdrawal({
        quantity: quantityToWithdraw,
        purchasePricePkr: selectedLot.purchase_price,
        withdrawalPriceOriginal: currentPriceInDisplayCurrency,
        withdrawalCurrency,
        withdrawalExchangeRate:
          displayCurrency === BASE_CURRENCY ? 1 : withdrawalRate,
      })
    : null;
  const fullWithdrawal =
    quantityToWithdraw !== null &&
    availableQuantity > 0 &&
    Math.abs(quantityToWithdraw - availableQuantity) < 1e-10;

  async function handleCashOut() {
    if (loading || !selectedLot) return;

    if (
      parsedAmount === null ||
      parsedAmount <= 0 ||
      maximumAmount <= 0 ||
      parsedAmount > maximumAmount + amountTolerance ||
      quantityToWithdraw === null ||
      quantityToWithdraw <= 0 ||
      quantityToWithdraw > availableQuantity
    ) {
      setError("Enter an amount within the available investment value.");
      return;
    }

    if (!accountId) {
      setError("Choose the account that will receive the money.");
      return;
    }

    if (displayCurrency !== BASE_CURRENCY && !ratesReady) {
      setError("Exchange rates are unavailable. The cash out was not recorded.");
      return;
    }

    const confirmedRate =
      displayCurrency === BASE_CURRENCY
        ? 1
        : getRate(displayCurrency, BASE_CURRENCY);

    if (
      confirmedRate === null ||
      !Number.isFinite(confirmedRate) ||
      confirmedRate <= 0
    ) {
      setError("The exchange rate is invalid. The cash out was not recorded.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: cashOutError } = await supabase.rpc("withdraw_investment", {
      p_investment_id: selectedLot.id,
      p_quantity: quantityToWithdraw,
      p_withdrawal_price_original: currentPriceInDisplayCurrency,
      p_withdrawal_currency: displayCurrency,
      p_withdrawal_exchange_rate: confirmedRate,
      p_destination_account_id: accountId,
      p_withdrawn_at: getAppDateKey(),
    });

    setLoading(false);

    if (cashOutError) {
      setError(
        getUserMutationError(
          cashOutError,
          "Investment could not be cashed out. Try again.",
        ),
      );
      toast.error("Failed to cash out investment");
      return;
    }

    toast.success(
      fullWithdrawal
        ? "Investment cashed out and closed!"
        : "Investment cash out recorded!",
    );
    onSuccess();
    onClose();
  }

  const displayAmount = (value: number) =>
    formatCurrency(value, {
      currency: displayCurrency,
      fromCurrency: displayCurrency,
    });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${financeModalContentClass} sm:[--finance-modal-max-width:29rem] sm:max-w-md`}
        style={
          {
            "--finance-action": INVESTMENT_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title="Cash Out Investment" />

        <FinanceModalBody>
          <div className="rounded-[18px] bg-investment-soft/55 px-4 py-3.5">
            <p className="text-xs font-semibold text-text-primary">
              {selectedLot?.name ?? "Investment"}
              {selectedLot?.symbol ? ` · ${selectedLot.symbol.toUpperCase()}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              Money is added to the selected account only after confirmation.
            </p>
          </div>

          {lots.length > 1 ? (
            <FinanceFormField label="Purchase" htmlFor="cash-out-lot">
              <select
                id="cash-out-lot"
                value={selectedLot?.id ?? ""}
                onChange={(event) => {
                  setLotId(event.target.value);
                  setAmount("");
                  setMaximumSelected(false);
                  setError("");
                }}
                className="finance-focus h-11 w-full rounded-[12px] border border-border bg-card px-3 text-sm font-semibold text-text-primary"
              >
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {getLotLabel(lot)}
                  </option>
                ))}
              </select>
            </FinanceFormField>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="field-label mb-0" htmlFor="cash-out-amount">
                Amount
              </label>
              <button
                type="button"
                onClick={() => {
                  setAmount(formatInputNumber(maximumAmount, displayCurrency));
                  setMaximumSelected(true);
                  setError("");
                }}
                disabled={maximumAmount <= 0}
                className="finance-focus min-h-8 text-[11px] font-semibold text-active disabled:opacity-40"
              >
                Max {maximumAmount > 0 ? displayAmount(maximumAmount) : "—"}
              </button>
            </div>
            <div className="relative">
              <Input
                id="cash-out-amount"
                type="number"
                inputMode="decimal"
                min="0"
                max={maximumAmount || undefined}
                step={displayCurrency === "JPY" ? "1" : "any"}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setMaximumSelected(false);
                  setError("");
                }}
                placeholder="0"
                className="pr-16 font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-black text-text-secondary">
                {displayCurrency}
              </span>
            </div>
          </div>

          <FinanceFormField label="Receive In" htmlFor="cash-out-account">
            <AccountSelect
              id="cash-out-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Cash out destination account"
              scrollPicker
            />
          </FinanceFormField>

          {preview ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[16px] bg-surface-secondary/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                  Account receives
                </p>
                <p className="mt-1 break-words text-sm font-bold tabular-nums text-text-primary [overflow-wrap:anywhere]">
                  {formatCurrency(preview.proceedsPkr)}
                </p>
              </div>
              <div className="rounded-[16px] bg-surface-secondary/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                  Realized P/L
                </p>
                <p
                  className={`mt-1 break-words text-sm font-bold tabular-nums [overflow-wrap:anywhere] ${
                    preview.realizedPnlPkr >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {preview.realizedPnlPkr >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(preview.realizedPnlPkr))}
                </p>
              </div>
            </div>
          ) : null}

          <p className="text-[11px] leading-5 text-text-secondary">
            The amount uses the latest available price. A partial cash out keeps the
            remaining quantity invested; the maximum amount closes this purchase.
          </p>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleCashOut}
            disabled={
              loading ||
              loadingOptions ||
              !selectedLot ||
              maximumAmount <= 0 ||
              (displayCurrency !== BASE_CURRENCY && !ratesReady)
            }
            loading={loading}
            loadingLabel="Cashing out…"
            className={financePrimaryButtonClass}
            style={{ background: INVESTMENT_ACTION_COLOR }}
          >
            Cash Out to Account
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
