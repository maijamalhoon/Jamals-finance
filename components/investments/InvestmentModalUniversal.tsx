"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import AccountSelect from "@/components/accounts/AccountSelect";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  useInvestmentMarketPrices,
  useSelectedInvestmentMarketPrice,
  type MarketPriceSnapshot,
} from "@/components/investments/useInvestmentMarketPrices";
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
  getCurrencyFractionDigits,
  isSupportedCurrency,
  type SupportedCurrency,
} from "@/lib/currency";
import { getEditableMoneyValue } from "@/lib/currency-input";
import { getAppDateKey } from "@/lib/dates";
import {
  searchInvestmentAssetCatalog,
  type InvestmentAssetType,
  type InvestmentMarketAsset,
} from "@/lib/market/investment-asset-catalog";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";

import type { ExistingInvestment } from "./InvestmentModalLocal";

const INVESTMENT_ACTION_COLOR = "#6849B8";

const MANUAL_ASSET_TYPES: readonly {
  value: InvestmentAssetType | "other";
  label: string;
}[] = [
  { value: "crypto", label: "Crypto" },
  { value: "stock", label: "Stock" },
  { value: "forex", label: "Forex" },
  { value: "other", label: "Other" },
];

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
  icon_key?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investment?: ExistingInvestment;
};

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(year, month - 1, day);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function normalizeCurrency(
  value: string | null | undefined,
  fallback: SupportedCurrency,
): SupportedCurrency {
  return isSupportedCurrency(value) ? value : fallback;
}

function formatInputPrice(value: number, currency: SupportedCurrency) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const standardDigits = getCurrencyFractionDigits(currency);
  const decimals =
    currency === "JPY"
      ? 0
      : value >= 1_000
        ? standardDigits
        : value >= 1
          ? Math.max(standardDigits, 8)
          : 12;
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

function getAssetInitials(name: string, symbol?: string | null) {
  const cleanSymbol = (symbol ?? "").trim().toUpperCase();
  if (cleanSymbol) return cleanSymbol.replace(/[^A-Z0-9]/g, "").slice(0, 2);
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "IN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function getChangeColor(change: number | null) {
  if (change === null || change === 0) return "var(--text-secondary)";
  return change > 0 ? "var(--income)" : "var(--expense)";
}

function formatChange(change: number | null) {
  if (change === null) return "—";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
}

function getModeLabel(asset: InvestmentMarketAsset) {
  if (asset.priceMode === "realtime") return "Real-time";
  if (asset.priceMode === "reference") return "Reference";
  return "Delayed";
}

function getSourceLabel(
  snapshot: MarketPriceSnapshot,
  asset: InvestmentMarketAsset,
) {
  if (snapshot.status === "connecting") return "Connecting…";
  if (snapshot.status !== "live") {
    return "Price unavailable · manual entry enabled";
  }
  if (asset.priceMode === "realtime") return "Real-time market price · Binance";
  if (asset.priceMode === "reference") return "Official reference rate · daily";
  return "Public delayed market quote";
}

function CurrencyPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: SupportedCurrency;
  onChange: (value: SupportedCurrency) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        if (isSupportedCurrency(event.target.value)) onChange(event.target.value);
      }}
      disabled={disabled}
      aria-label="Currency"
      className="finance-focus h-9 min-w-[4.75rem] rounded-[10px] border border-border bg-surface-secondary px-2 text-[10px] font-black text-text-primary disabled:cursor-not-allowed disabled:opacity-45"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}

function AssetAvatar({ asset }: { asset: InvestmentMarketAsset }) {
  const [failed, setFailed] = useState(false);
  if (!asset.logoUrl || failed) {
    return (
      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-surface-secondary text-xs font-bold text-active">
        {getAssetInitials(asset.name, asset.symbol)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.logoUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-10 w-10 flex-shrink-0 rounded-full object-contain"
    />
  );
}

export default function InvestmentModalUniversal({
  open,
  onClose,
  onSuccess,
  investment,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const {
    currency: displayCurrency,
    rates,
    ratesReady,
    getRate,
    formatCurrency,
  } = useCurrency();
  const isEditing = Boolean(investment);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<InvestmentAssetType | "other">("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] =
    useState<SupportedCurrency>(BASE_CURRENCY);
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentPriceCurrency, setCurrentPriceCurrency] =
    useState<SupportedCurrency>(BASE_CURRENCY);
  const [purchasedAt, setPurchasedAt] = useState(getAppDateKey());
  const [assetId, setAssetId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState("manual");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [isLivePriced, setIsLivePriced] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedAsset, setSelectedAsset] =
    useState<InvestmentMarketAsset | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanQuery = query.trim();
  const isTypingAfterSelection = selectedAsset
    ? cleanQuery.toLowerCase() !== selectedAsset.name.toLowerCase()
    : true;
  const results = useMemo(
    () => searchInvestmentAssetCatalog(cleanQuery, 8),
    [cleanQuery],
  );
  const showSearchDropdown =
    !isEditing &&
    !manualMode &&
    searchFocused &&
    cleanQuery.length >= 1 &&
    (!selectedAsset || isTypingAfterSelection);
  const searchPrices = useInvestmentMarketPrices(results, showSearchDropdown);
  const selectedMarketPrice = useSelectedInvestmentMarketPrice(
    selectedAsset,
    open && !isEditing && !manualMode,
  );
  const marketPricedSelected =
    Boolean(selectedAsset) &&
    selectedMarketPrice.status === "live" &&
    selectedMarketPrice.price !== null &&
    Boolean(selectedMarketPrice.currency) &&
    !manualMode;
  const marketDisplayPrice =
    marketPricedSelected &&
    selectedMarketPrice.price !== null &&
    selectedMarketPrice.currency
      ? convertMoney(
          selectedMarketPrice.price,
          selectedMarketPrice.currency,
          currentPriceCurrency,
          rates,
        )
      : Number.NaN;
  const displayedCurrentPrice = marketPricedSelected
    ? formatInputPrice(marketDisplayPrice, currentPriceCurrency)
    : currentPrice;

  useEffect(() => {
    setActiveResultIndex(0);
  }, [cleanQuery]);

  useEffect(() => {
    if (!open) return;

    if (investment) {
      const savedPurchaseCurrency = normalizeCurrency(
        investment.purchase_currency,
        displayCurrency,
      );
      const savedCurrentCurrency = normalizeCurrency(
        investment.current_price_currency,
        displayCurrency,
      );
      const editablePurchase = getEditableMoneyValue({
        amountPkr: investment.purchase_price,
        originalAmount: investment.purchase_price_original,
        originalCurrency: investment.purchase_currency,
        displayCurrency: savedPurchaseCurrency,
        rates,
      });
      const editableCurrent = getEditableMoneyValue({
        amountPkr: investment.current_price,
        originalAmount: investment.current_price_original,
        originalCurrency: investment.current_price_currency,
        displayCurrency: savedCurrentCurrency,
        rates,
      });
      const investmentType = String(investment.type ?? "other").toLowerCase();
      const safeType = MANUAL_ASSET_TYPES.some(
        (item) => item.value === investmentType,
      )
        ? (investmentType as InvestmentAssetType | "other")
        : "other";

      setName(investment.name);
      setType(safeType);
      setQuantity(String(investment.quantity));
      setPurchasePrice(
        formatInputPrice(editablePurchase ?? 0, savedPurchaseCurrency),
      );
      setPurchaseCurrency(savedPurchaseCurrency);
      setCurrentPrice(
        formatInputPrice(editableCurrent ?? 0, savedCurrentCurrency),
      );
      setCurrentPriceCurrency(savedCurrentCurrency);
      setPurchasedAt(investment.purchased_at);
      setAssetId(investment.asset_id ?? null);
      setSymbol(investment.symbol ?? null);
      setImageUrl(investment.image_url ?? null);
      setPriceSource(investment.price_source ?? "manual");
      setPriceUpdatedAt(investment.price_updated_at ?? null);
      setPriceChange24h(investment.price_change_24h ?? null);
      setIsLivePriced(Boolean(investment.is_live_priced));
      setAccountId("");
      setManualMode(true);
      setQuery("");
      setSelectedAsset(null);
    } else {
      setName("");
      setType("crypto");
      setQuantity("");
      setPurchasePrice("");
      setPurchaseCurrency(displayCurrency);
      setCurrentPrice("");
      setCurrentPriceCurrency(displayCurrency);
      setPurchasedAt(getAppDateKey());
      setAssetId(null);
      setSymbol(null);
      setImageUrl(null);
      setPriceSource("manual");
      setPriceUpdatedAt(null);
      setPriceChange24h(null);
      setIsLivePriced(false);
      setAccountId("");
      setManualMode(false);
      setQuery("");
      setSelectedAsset(null);
    }

    setSearchFocused(false);
    setActiveResultIndex(0);
    setError("");
  }, [displayCurrency, investment, open, rates]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      const accountsRequest = supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");
      const linkedTransactionRequest = investment?.id
        ? supabase
            .from("transactions")
            .select("account_id")
            .eq("investment_id", investment.id)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

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
      setAccountId((current) => {
        const preferred = linkedAccountId || current;
        if (nextAccounts.some((account) => account.id === preferred)) {
          return preferred;
        }
        return nextAccounts[0]?.id ?? "";
      });
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [investment?.id, open, supabase]);

  useEffect(() => {
    if (!open || isEditing || manualMode) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEditing, manualMode, open]);

  useEffect(() => {
    if (!selectedAsset) return;

    if (
      selectedMarketPrice.status === "live" &&
      selectedMarketPrice.price !== null &&
      selectedMarketPrice.currency
    ) {
      setPriceSource(selectedMarketPrice.source);
      setPriceUpdatedAt(
        new Date(selectedMarketPrice.updatedAt ?? Date.now()).toISOString(),
      );
      setPriceChange24h(selectedMarketPrice.change24h);
      setIsLivePriced(true);
      setCurrentPriceCurrency(selectedMarketPrice.currency);
      return;
    }

    if (selectedMarketPrice.status === "unavailable") {
      setPriceSource("manual");
      setPriceUpdatedAt(null);
      setPriceChange24h(null);
      setIsLivePriced(false);
    }
  }, [selectedAsset, selectedMarketPrice]);

  function clearMarketSelection() {
    setAssetId(null);
    setSymbol(null);
    setImageUrl(null);
    setPriceSource("manual");
    setPriceUpdatedAt(null);
    setPriceChange24h(null);
    setIsLivePriced(false);
    setCurrentPriceCurrency(displayCurrency);
    setSelectedAsset(null);
  }

  function handleManualMode() {
    setManualMode(true);
    setName((current) => current || query.trim());
    setType("other");
    setPurchaseCurrency(displayCurrency);
    setCurrentPriceCurrency(displayCurrency);
    clearMarketSelection();
    setCurrentPrice("");
    setSearchFocused(false);
  }

  function handleSelectAsset(asset: InvestmentMarketAsset) {
    setSelectedAsset(asset);
    setName(asset.name);
    setType(asset.assetType);
    setAssetId(asset.id);
    setSymbol(asset.symbol);
    setImageUrl(asset.logoUrl || null);
    setPriceSource("catalog");
    setPriceUpdatedAt(null);
    setPriceChange24h(null);
    setIsLivePriced(false);
    setCurrentPriceCurrency(asset.quoteCurrency);
    setCurrentPrice("");
    setPurchaseCurrency(displayCurrency);
    setQuery(asset.name);
    setSearchFocused(false);
    setActiveResultIndex(0);
    setError("");
  }

  function handleClearSearch() {
    setQuery("");
    setName("");
    clearMarketSelection();
    setCurrentPrice("");
    setSearchFocused(false);
    setActiveResultIndex(0);
  }

  async function handleSave() {
    if (loading) return;
    const assetName = name.trim();
    const parsedQuantity = parseNumber(quantity);
    const parsedPurchasePrice = parseNumber(purchasePrice);
    const parsedCurrentPrice = currentPrice ? parseNumber(currentPrice) : null;
    const purchaseDate = purchasedAt.trim();

    if (!assetName) {
      setError("Enter or select an asset.");
      return;
    }
    if (parsedQuantity === null || parsedQuantity <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (parsedPurchasePrice === null || parsedPurchasePrice <= 0) {
      setError("Enter a buying price greater than 0.");
      return;
    }
    if (
      !marketPricedSelected &&
      parsedCurrentPrice !== null &&
      parsedCurrentPrice <= 0
    ) {
      setError("Enter a current price greater than 0, or leave it blank.");
      return;
    }
    if (!accountId) {
      setError("Add an account before adding an investment.");
      return;
    }
    if (!isValidDateKey(purchaseDate)) {
      setError("Enter a valid purchase date.");
      return;
    }

    const currentOriginalPrice =
      marketPricedSelected && selectedMarketPrice.price !== null
        ? selectedMarketPrice.price
        : (parsedCurrentPrice ?? parsedPurchasePrice);
    const savedCurrentCurrency: SupportedCurrency =
      marketPricedSelected && selectedMarketPrice.currency
        ? selectedMarketPrice.currency
        : parsedCurrentPrice !== null
          ? currentPriceCurrency
          : purchaseCurrency;
    const purchaseRateToPkr = getRate(purchaseCurrency, BASE_CURRENCY);
    const currentRateToPkr = getRate(savedCurrentCurrency, BASE_CURRENCY);

    if (
      (purchaseCurrency !== BASE_CURRENCY ||
        savedCurrentCurrency !== BASE_CURRENCY) &&
      !ratesReady
    ) {
      setError("Exchange rates are unavailable. The investment was not saved.");
      return;
    }
    if (
      purchaseRateToPkr === null ||
      currentRateToPkr === null ||
      !Number.isFinite(currentOriginalPrice) ||
      currentOriginalPrice <= 0
    ) {
      setError(
        "Investment prices could not be converted safely. Nothing was saved.",
      );
      return;
    }

    setLoading(true);
    setError("");
    const { error: saveError } = await supabase.rpc(
      "save_investment_purchase_currency",
      {
        p_investment_id: investment?.id ?? null,
        p_name: assetName,
        p_type: type,
        p_quantity: parsedQuantity,
        p_purchase_price_original: parsedPurchasePrice,
        p_purchase_currency: purchaseCurrency,
        p_purchase_exchange_rate_to_pkr: purchaseRateToPkr,
        p_current_price_original: currentOriginalPrice,
        p_current_price_currency: savedCurrentCurrency,
        p_current_exchange_rate_to_pkr: currentRateToPkr,
        p_purchased_at: purchaseDate,
        p_asset_id: assetId,
        p_symbol: symbol,
        p_image_url: imageUrl,
        p_price_source: marketPricedSelected
          ? selectedMarketPrice.source
          : priceSource,
        p_price_updated_at: marketPricedSelected
          ? new Date(selectedMarketPrice.updatedAt ?? Date.now()).toISOString()
          : priceUpdatedAt,
        p_price_change_24h: marketPricedSelected
          ? selectedMarketPrice.change24h
          : priceChange24h,
        p_is_live_priced: marketPricedSelected ? true : isLivePriced,
        p_account_id: accountId,
      },
    );
    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(
          saveError,
          "Investment could not be saved. Try again.",
        ),
      );
      toast.error("Failed to save investment");
      return;
    }

    toast.success(isEditing ? "Investment updated!" : "Investment added!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem] sm:max-w-lg`}
        style={{ "--finance-action": INVESTMENT_ACTION_COLOR } as CSSProperties}
      >
        <FinanceModalHeader
          title={isEditing ? "Edit Investment" : "Investment"}
        />

        <FinanceModalBody>
          {!isEditing && !manualMode ? (
            <div ref={searchContainerRef} className="relative">
              <label className="field-label" htmlFor="investment-asset-search">
                Search Asset
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                />
                <Input
                  id="investment-asset-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearchFocused(true);
                    if (selectedAsset || assetId) {
                      clearMarketSelection();
                      setCurrentPrice("");
                    }
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSearchFocused(false);
                      return;
                    }
                    if (!showSearchDropdown || results.length === 0) return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveResultIndex((current) =>
                        Math.min(current + 1, results.length - 1),
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveResultIndex((current) =>
                        Math.max(current - 1, 0),
                      );
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const activeAsset = results[activeResultIndex];
                      if (activeAsset) handleSelectAsset(activeAsset);
                    }
                  }}
                  placeholder="Search crypto, stocks or forex"
                  className="pl-9 pr-10"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSearchDropdown}
                  aria-controls="investment-asset-results"
                  aria-activedescendant={
                    showSearchDropdown && results[activeResultIndex]
                      ? `investment-asset-${results[activeResultIndex].id}`
                      : undefined
                  }
                />
                {query ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="finance-focus absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                    aria-label="Clear asset search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleManualMode}
                className="finance-focus mt-1.5 inline-flex min-h-8 items-center text-[11px] font-semibold text-active hover:text-active-hover"
              >
                Can&apos;t find it? Add manually
              </button>

              {showSearchDropdown ? (
                <div
                  id="investment-asset-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 rounded-[16px] border border-border bg-card p-1.5 shadow-premium"
                >
                  {results.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs font-semibold text-text-primary">
                        No matching asset found
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Try another name or symbol, or add it manually.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {results.map((asset, index) => {
                        const active = index === activeResultIndex;
                        const quote = searchPrices[asset.id];
                        const liveLabel =
                          quote?.status === "live" &&
                          quote.price !== null &&
                          quote.currency
                            ? formatCurrency(quote.price, {
                                fromCurrency: quote.currency,
                                currency: displayCurrency,
                                maximumFractionDigits:
                                  displayCurrency === "JPY" ? 0 : 6,
                              })
                            : quote?.status === "connecting"
                              ? "Connecting…"
                              : "Price unavailable";

                        return (
                          <button
                            id={`investment-asset-${asset.id}`}
                            key={asset.id}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setActiveResultIndex(index)}
                            onClick={() => handleSelectAsset(asset)}
                            className={`finance-focus flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors ${
                              active ? "bg-hover" : "hover:bg-hover"
                            }`}
                          >
                            <AssetAvatar asset={asset} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-text-primary">
                                {asset.name}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                <span>{asset.symbol}</span>
                                <span aria-hidden="true">·</span>
                                <span>{asset.assetType}</span>
                                <span aria-hidden="true">·</span>
                                <span>{getModeLabel(asset)}</span>
                              </span>
                            </span>
                            <span className="flex-shrink-0 text-right">
                              <span className="block text-[11px] font-semibold tabular-nums text-text-primary">
                                {liveLabel}
                              </span>
                              <span
                                className="mt-0.5 block text-[10px] font-semibold tabular-nums"
                                style={{
                                  color: getChangeColor(
                                    quote?.change24h ?? null,
                                  ),
                                }}
                              >
                                {formatChange(quote?.change24h ?? null)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <FinanceFormField label="Asset Name" htmlFor="investment-name">
                <Input
                  id="investment-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Gold, property, private business"
                />
              </FinanceFormField>
              <FinanceFormField label="Asset Type" htmlFor="investment-type">
                <select
                  id="investment-type"
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as InvestmentAssetType | "other",
                    )
                  }
                  className="finance-focus h-11 w-full rounded-[12px] border border-border bg-surface-secondary px-3 text-sm font-semibold text-text-primary"
                >
                  {MANUAL_ASSET_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FinanceFormField>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    setName("");
                    setQuery("");
                    setType("crypto");
                    clearMarketSelection();
                    setCurrentPrice("");
                  }}
                  className="finance-focus -mt-1 inline-flex min-h-8 items-center text-[11px] font-semibold text-active hover:text-active-hover"
                >
                  Search market assets instead
                </button>
              ) : null}
            </>
          )}

          <FinanceFormField label="Quantity" htmlFor="investment-quantity">
            <Input
              id="investment-quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="1"
              className="font-semibold tabular-nums"
            />
          </FinanceFormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  className="field-label mb-0"
                  htmlFor="investment-purchase-price"
                >
                  Buying Price
                </label>
                <CurrencyPicker
                  value={purchaseCurrency}
                  onChange={setPurchaseCurrency}
                />
              </div>
              <Input
                id="investment-purchase-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.target.value)}
                placeholder="0"
                className="font-semibold tabular-nums"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  className="field-label mb-0"
                  htmlFor="investment-current-price"
                >
                  Current Price
                </label>
                <CurrencyPicker
                  value={currentPriceCurrency}
                  onChange={setCurrentPriceCurrency}
                  disabled={marketPricedSelected}
                />
              </div>
              <Input
                id="investment-current-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={displayedCurrentPrice}
                onChange={(event) => {
                  if (marketPricedSelected) return;
                  setCurrentPrice(event.target.value);
                }}
                readOnly={marketPricedSelected}
                placeholder={
                  selectedMarketPrice.status === "connecting"
                    ? "Connecting to market…"
                    : "Leave blank to match buying price"
                }
                className="font-semibold tabular-nums read-only:bg-surface-secondary read-only:text-text-primary"
              />
              {selectedAsset ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-medium">
                  <span className="text-text-secondary">
                    {getSourceLabel(selectedMarketPrice, selectedAsset)}
                  </span>
                  {selectedMarketPrice.status === "live" ? (
                    <span
                      className="font-semibold tabular-nums"
                      style={{
                        color: getChangeColor(selectedMarketPrice.change24h),
                      }}
                    >
                      {formatChange(selectedMarketPrice.change24h)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <FinanceFormField label="Account" htmlFor="investment-account">
            <AccountSelect
              id="investment-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Investment account"
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField label="Date" htmlFor="investment-purchased-at">
            <DatePicker
              id="investment-purchased-at"
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Investment purchase date"
            />
          </FinanceFormField>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              loading ||
              loadingOptions ||
              ((purchaseCurrency !== BASE_CURRENCY ||
                currentPriceCurrency !== BASE_CURRENCY) &&
                !ratesReady)
            }
            loading={loading}
            loadingLabel="Saving investment…"
            className={financePrimaryButtonClass}
            style={{ background: INVESTMENT_ACTION_COLOR }}
          >
            {isEditing ? "Update Investment" : "Add Investment"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
