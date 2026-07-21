"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
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
  SUPPORTED_CURRENCIES,
  convertMoney,
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

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(12).replace(/\.?0+$/, "");
}

function getInvestmentLabel(investment: ExistingInvestment) {
  const symbol = investment.symbol?.trim().toUpperCase();
  return symbol ? `${investment.name} (${symbol})` : investment.name;
}

function CurrencyPicker({
  value,
  onChange,
}: {
  value: InvestmentCurrency;
  onChange: (currency: InvestmentCurrency) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        if (isSupportedCurrency(event.target.value)) onChange(event.target.value);
      }}
      aria-label="Withdrawal currency"
      className="finance-focus h-9 min-w-[4.75rem] rounded-[10px] border border-border bg-surface-secondary px-2 text-[10px] font-black text-text-primary"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}

export default function InvestmentWithdrawModal({
  open,
  investments,
  onClose,
  onSuccess,
}: {
  open: boolean;
  investments: ExistingInvestment[];
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
  const initializedInvestmentRef = useRef<string | null>(null);

  const [investmentId, setInvestmentId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [withdrawalPrice, setWithdrawalPrice] = useState("");
  const [withdrawalCurrency, setWithdrawalCurrency] =
    useState<InvestmentCurrency>(BASE_CURRENCY);
  const [exchangeRate, setExchangeRate] = useState("1");
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [withdrawnAt, setWithdrawnAt] = useState(getAppDateKey());
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedInvestment = useMemo(
    () => investments.find((investment) => investment.id === investmentId) ?? null,
    [investmentId, investments],
  );

  function getPriceInCurrency(
    investment: ExistingInvestment,
    currency: SupportedCurrency,
  ) {
    const canonicalPkr = parseFinite(investment.current_price) ?? 0;
    const original = parseFinite(investment.current_price_original);
    const originalCurrency = isSupportedCurrency(
      investment.current_price_currency,
    )
      ? investment.current_price_currency
      : null;

    if (original !== null && originalCurrency === currency) return original;
    return convertMoney(canonicalPkr, BASE_CURRENCY, currency, rates);
  }

  useEffect(() => {
    if (!open) {
      initializedInvestmentRef.current = null;
      return;
    }

    const nextId = investmentId || investments[0]?.id || "";
    if (!nextId) return;
    if (investmentId !== nextId) setInvestmentId(nextId);
    if (initializedInvestmentRef.current === nextId) return;

    const investment = investments.find((item) => item.id === nextId);
    if (!investment) return;

    initializedInvestmentRef.current = nextId;
    const availableQuantity = parseFinite(investment.quantity) ?? 0;
    const nextCurrency = displayCurrency as InvestmentCurrency;
    const nextPrice = getPriceInCurrency(investment, nextCurrency);
    const nextRate = getRate(nextCurrency, BASE_CURRENCY);

    setQuantity(formatInputNumber(availableQuantity));
    setWithdrawalCurrency(nextCurrency);
    setWithdrawalPrice(formatInputNumber(nextPrice));
    setExchangeRate(formatInputNumber(nextRate ?? 0));
    setWithdrawnAt(getAppDateKey());
    setError("");
  }, [displayCurrency, getRate, investmentId, investments, open, rates]);

  useEffect(() => {
    if (!open || !investmentId) return;

    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);

      const accountsRequest = supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");

      const linkedTransactionRequest = supabase
        .from("transactions")
        .select("account_id")
        .eq("investment_id", investmentId)
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
        setError(
          "Accounts could not be loaded. Check your connection and try again.",
        );
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

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [investmentId, open, supabase]);

  const availableQuantity = parseFinite(selectedInvestment?.quantity) ?? 0;
  const parsedQuantity = parseFinite(quantity);
  const parsedWithdrawalPrice = parseFinite(withdrawalPrice);
  const parsedExchangeRate = parseFinite(exchangeRate);
  const preview = selectedInvestment
    ? calculateInvestmentWithdrawal({
        quantity: parsedQuantity,
        purchasePricePkr: selectedInvestment.purchase_price,
        withdrawalPriceOriginal: parsedWithdrawalPrice,
        withdrawalCurrency,
        withdrawalExchangeRate:
          withdrawalCurrency === BASE_CURRENCY ? 1 : parsedExchangeRate,
      })
    : null;
  const fullWithdrawal =
    parsedQuantity !== null &&
    availableQuantity > 0 &&
    Math.abs(parsedQuantity - availableQuantity) < 1e-10;

  function changeCurrency(currency: InvestmentCurrency) {
    setWithdrawalCurrency(currency);

    if (!selectedInvestment) return;

    const nextPrice = getPriceInCurrency(selectedInvestment, currency);
    const nextRate = getRate(currency, BASE_CURRENCY);
    setWithdrawalPrice(formatInputNumber(nextPrice));
    setExchangeRate(formatInputNumber(nextRate ?? 0));
    setError("");
  }

  async function handleWithdraw() {
    if (loading || !selectedInvestment) return;

    if (
      parsedQuantity === null ||
      parsedQuantity <= 0 ||
      parsedQuantity > availableQuantity
    ) {
      setError(`Enter a quantity from 0 to ${availableQuantity}.`);
      return;
    }

    if (parsedWithdrawalPrice === null || parsedWithdrawalPrice < 0) {
      setError("Enter a withdrawal price of 0 or more.");
      return;
    }

    if (!accountId) {
      setError("Choose the account that will receive the withdrawal.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(withdrawnAt)) {
      setError("Enter a valid withdrawal date.");
      return;
    }

    if (withdrawalCurrency !== BASE_CURRENCY && !ratesReady) {
      setError("Exchange rates are unavailable. The withdrawal was not recorded.");
      return;
    }

    const confirmedRate =
      withdrawalCurrency === BASE_CURRENCY
        ? 1
        : getRate(withdrawalCurrency, BASE_CURRENCY);
    if (
      confirmedRate === null ||
      !Number.isFinite(confirmedRate) ||
      confirmedRate <= 0
    ) {
      setError("The exchange rate is invalid. The withdrawal was not recorded.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: withdrawalError } = await supabase.rpc(
      "withdraw_investment",
      {
        p_investment_id: selectedInvestment.id,
        p_quantity: parsedQuantity,
        p_withdrawal_price_original: parsedWithdrawalPrice,
        p_withdrawal_currency: withdrawalCurrency,
        p_withdrawal_exchange_rate: confirmedRate,
        p_destination_account_id: accountId,
        p_withdrawn_at: withdrawnAt,
      },
    );

    setLoading(false);

    if (withdrawalError) {
      setError(
        getUserMutationError(
          withdrawalError,
          "Investment could not be withdrawn. Try again.",
        ),
      );
      toast.error("Failed to withdraw investment");
      return;
    }

    toast.success(
      fullWithdrawal
        ? "Investment withdrawn and closed!"
        : "Investment withdrawal recorded!",
    );
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem] sm:max-w-lg`}
        style={
          {
            "--finance-action": INVESTMENT_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title="Withdraw Investment" />

        <FinanceModalBody>
          <FinanceFormField label="Investment" htmlFor="withdraw-investment-id">
            <select
              id="withdraw-investment-id"
              value={investmentId}
              onChange={(event) => {
                initializedInvestmentRef.current = null;
                setInvestmentId(event.target.value);
                setError("");
              }}
              className="finance-focus h-11 w-full rounded-[12px] border border-border bg-card px-3 text-sm font-semibold text-text-primary"
            >
              {investments.map((investment) => (
                <option key={investment.id} value={investment.id}>
                  {getInvestmentLabel(investment)}
                </option>
              ))}
            </select>
          </FinanceFormField>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="field-label mb-0" htmlFor="withdraw-quantity">
                Quantity
              </label>
              <button
                type="button"
                onClick={() =>
                  setQuantity(formatInputNumber(availableQuantity))
                }
                className="finance-focus min-h-8 text-[11px] font-semibold text-active hover:text-active-hover"
              >
                Max {formatInputNumber(availableQuantity)}
              </button>
            </div>
            <Input
              id="withdraw-quantity"
              type="number"
              inputMode="decimal"
              min="0"
              max={availableQuantity}
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="font-semibold tabular-nums"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="field-label mb-0" htmlFor="withdraw-price">
                Withdrawal Price
              </label>
              <CurrencyPicker
                value={withdrawalCurrency}
                onChange={changeCurrency}
              />
            </div>
            <Input
              id="withdraw-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={withdrawalPrice}
              onChange={(event) => setWithdrawalPrice(event.target.value)}
              className="font-semibold tabular-nums"
            />
          </div>

          {withdrawalCurrency !== BASE_CURRENCY ? (
            <FinanceFormField
              label={`${withdrawalCurrency} to PKR Rate`}
              htmlFor="withdraw-rate"
              hint="The validated rate is locked with this withdrawal."
            >
              <Input
                id="withdraw-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={exchangeRate}
                readOnly
                placeholder="Live exchange rate"
                className="font-semibold tabular-nums read-only:bg-surface-secondary"
              />
            </FinanceFormField>
          ) : null}

          <FinanceFormField label="Receive In" htmlFor="withdraw-account">
            <AccountSelect
              id="withdraw-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Withdrawal destination account"
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField label="Date" htmlFor="withdraw-date">
            <DatePicker
              id="withdraw-date"
              value={withdrawnAt}
              onChange={setWithdrawnAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Investment withdrawal date"
            />
          </FinanceFormField>

          {preview ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="finance-panel-soft min-w-0 p-3">
                <p className="text-[11px] text-text-secondary">Account receives</p>
                <p className="mt-1 break-words text-sm font-bold text-text-primary [overflow-wrap:anywhere]">
                  {formatCurrency(preview.proceedsPkr)}
                </p>
              </div>
              <div className="finance-panel-soft min-w-0 p-3">
                <p className="text-[11px] text-text-secondary">Realized P/L</p>
                <p
                  className={`mt-1 break-words text-sm font-bold [overflow-wrap:anywhere] ${
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
            Account balance changes only after this withdrawal is confirmed. A
            partial withdrawal keeps the remaining quantity invested; withdrawing
            the full quantity closes this investment lot.
          </p>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleWithdraw}
            disabled={
              loading ||
              loadingOptions ||
              !selectedInvestment ||
              (withdrawalCurrency !== BASE_CURRENCY && !ratesReady)
            }
            loading={loading}
            loadingLabel="Withdrawing investment…"
            className={financePrimaryButtonClass}
            style={{ background: INVESTMENT_ACTION_COLOR }}
          >
            Withdraw to Account
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
