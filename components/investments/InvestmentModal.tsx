"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import AccountSelect from "@/components/accounts/AccountSelect";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { getAppDateKey } from "@/lib/dates";
import { BASE_CURRENCY, formatMoney } from "@/lib/currency";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";

const TYPES = [
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
  { value: "savings", label: "Savings" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

type MarketKind = "crypto" | "stock";
type MarketProvider = "coingecko" | "alpha_vantage";

type MarketSearchResult = {
  id: string;
  kind: MarketKind;
  provider: MarketProvider;
  symbol: string;
  name: string;
  subtitle?: string;
  logoUrl?: string | null;
  currency: string;
  pricePkr?: number | null;
  priceUsd?: number | null;
  change24h?: number | null;
  changePercent?: number | null;
  lastUpdatedAt?: string | null;
  live: boolean;
  sourceLabel: string;
};

type SearchResponse = {
  results?: MarketSearchResult[];
  warnings?: string[];
  error?: string;
};

type ExchangeRateResponse = {
  rate?: number;
};

type CurrencyCode = "PKR" | "USD";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
};

function parseNumber(value: string) {
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

function formatPkr(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${BASE_CURRENCY} unavailable`;
  }

  return formatMoney(value, {
    currency: BASE_CURRENCY,
    fromCurrency: BASE_CURRENCY,
    maximumFractionDigits: value >= 100 ? 0 : 4,
  });
}

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "USD unavailable";
  }

  return formatMoney(value, {
    currency: "USD",
    fromCurrency: "USD",
    maximumFractionDigits: value >= 1 ? 2 : 6,
  });
}

function formatMarketChange(asset: MarketSearchResult | null) {
  const value =
    asset?.kind === "crypto" ? asset.change24h : asset?.changePercent;

  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%${
    asset?.kind === "crypto" ? " 24h" : ""
  }`;
}

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  return value === "USD" ? "USD" : "PKR";
}

function hasPkrPrice(asset: MarketSearchResult | null) {
  return (
    typeof asset?.pricePkr === "number" &&
    Number.isFinite(asset.pricePkr) &&
    asset.pricePkr > 0
  );
}

function getAssetInitials(name: string, symbol?: string | null) {
  const cleanSymbol = (symbol ?? "").trim().toUpperCase();
  if (cleanSymbol) return cleanSymbol.slice(0, 2);

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "IN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export interface ExistingInvestment {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  purchase_price_original?: number | string | null;
  purchase_currency?: string | null;
  current_price: number | string;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  purchased_at: string;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
  item_count?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investment?: ExistingInvestment;
}

export default function InvestmentModal({
  open,
  onClose,
  onSuccess,
  investment,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!investment;
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState<CurrencyCode>("PKR");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentPriceOriginal, setCurrentPriceOriginal] = useState<number | null>(
    null,
  );
  const [currentPriceCurrency, setCurrentPriceCurrency] =
    useState<CurrencyCode>("PKR");
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
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MarketSearchResult | null>(
    null,
  );
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanQuery = query.trim();
  const isTypingAfterSelection = selectedAsset
    ? cleanQuery.toLowerCase() !== selectedAsset.name.toLowerCase()
    : true;
  const showSearchDropdown =
    !isEditing &&
    !manualMode &&
    searchFocused &&
    cleanQuery.length >= 2 &&
    (!selectedAsset || isTypingAfterSelection);
  const marketPricedSelected =
    isLivePriced &&
    (priceSource === "coingecko" || priceSource === "alpha_vantage") &&
    Boolean(assetId) &&
    !manualMode;
  const marketPricePkr = selectedAsset?.pricePkr ?? parseNumber(currentPrice);
  const marketPriceUsd = selectedAsset?.priceUsd ?? currentPriceOriginal;
  const marketSourceLabel =
    priceSource === "alpha_vantage"
      ? "Latest quote via Alpha Vantage"
      : "Live via CoinGecko";
  const marketPriceLabel =
    priceSource === "alpha_vantage"
      ? "Current market quote"
      : "Current live price";
  const groupedResults = useMemo(
    () => [
      {
        label: "Crypto",
        items: results.filter((result) => result.kind === "crypto"),
      },
      {
        label: "International Stocks",
        items: results.filter((result) => result.kind === "stock"),
      },
    ],
    [results],
  );

  useEffect(() => {
    if (!open) return;
    if (investment) {
      const savedPurchaseCurrency = normalizeCurrency(investment.purchase_currency);
      const savedCurrentCurrency = normalizeCurrency(
        investment.current_price_currency,
      );
      const savedCurrentOriginal = Number(investment.current_price_original);

      setName(investment.name);
      setType(investment.type);
      setQuantity(String(investment.quantity));
      setPurchasePrice(
        savedPurchaseCurrency === "USD" && investment.purchase_price_original
          ? String(investment.purchase_price_original)
          : String(investment.purchase_price),
      );
      setPurchaseCurrency(savedPurchaseCurrency);
      setCurrentPrice(String(investment.current_price));
      setCurrentPriceOriginal(
        Number.isFinite(savedCurrentOriginal) ? savedCurrentOriginal : null,
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
      setManualMode(!investment.is_live_priced);
      setQuery("");
      setSelectedAsset(null);
    } else {
      setName("");
      setType("crypto");
      setQuantity("");
      setPurchasePrice("");
      setPurchaseCurrency("PKR");
      setCurrentPrice("");
      setCurrentPriceOriginal(null);
      setCurrentPriceCurrency("PKR");
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
    setResults([]);
    setSearchFocused(false);
    setSearchError("");
    setError("");
  }, [open, investment]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);

      const accountsRequest = supabase
        .from("accounts")
        .select("id, name, type, balance")
        .order("name");

      const linkedTransactionRequest =
        investment?.id
          ? supabase
              .from("transactions")
              .select("account_id")
              .eq("investment_id", investment.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

      const [{ data: accountRows, error: accountsError }, linkedTransaction] =
        await Promise.all([accountsRequest, linkedTransactionRequest]);

      if (cancelled) return;

      setLoadingOptions(false);

      if (accountsError) {
        setAccounts([]);
        setAccountId("");
        setError(accountsError.message || "Could not load accounts.");
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

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [investment?.id, open, supabase]);

  useEffect(() => {
    if (!open || isEditing || manualMode) return;

    if (cleanQuery.length < 2 || !isTypingAfterSelection) {
      setResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/market/search?q=${encodeURIComponent(cleanQuery)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Asset search is unavailable.");
        }

        setResults(data.results ?? []);
        setSearchError((data.warnings ?? []).join(" "));
      } catch (searchException) {
        if (
          searchException instanceof DOMException &&
          searchException.name === "AbortError"
        ) {
          return;
        }

        setResults([]);
        setSearchError(
          searchException instanceof Error
            ? searchException.message
            : "Asset search is unavailable.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cleanQuery, isEditing, isTypingAfterSelection, manualMode, open]);

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

  async function getUsdPkrRateForSave() {
    const response = await fetch("/api/exchange-rate");
    const data = (await response.json()) as ExchangeRateResponse;

    if (
      !response.ok ||
      typeof data.rate !== "number" ||
      !Number.isFinite(data.rate) ||
      data.rate <= 0
    ) {
      throw new Error("USD to PKR rate is unavailable right now.");
    }

    return data.rate;
  }

  function clearMarketSelection() {
    setAssetId(null);
    setSymbol(null);
    setImageUrl(null);
    setPriceSource("manual");
    setPriceUpdatedAt(null);
    setPriceChange24h(null);
    setIsLivePriced(false);
    setCurrentPriceOriginal(null);
    setCurrentPriceCurrency("PKR");
    setSelectedAsset(null);
  }

  function handleManualMode() {
    setManualMode(true);
    setName((current) => current || query.trim());
    setPurchaseCurrency("PKR");
    setCurrentPriceCurrency("PKR");
    clearMarketSelection();
    setResults([]);
    setSearchFocused(false);
    setSearchError("");
  }

  function handleSelectAsset(asset: MarketSearchResult) {
    const hasQuote = hasPkrPrice(asset);
    const nextType = asset.kind === "stock" ? "stocks" : "crypto";
    const nextAssetId = asset.kind === "stock" ? asset.symbol : asset.id;

    setSelectedAsset(asset);
    setName(asset.name);
    setType(nextType);
    setAssetId(nextAssetId);
    setSymbol(asset.symbol);
    setImageUrl(asset.logoUrl ?? null);
    setPriceSource(asset.provider);
    setPriceUpdatedAt(
      hasQuote ? asset.lastUpdatedAt ?? new Date().toISOString() : null,
    );
    setPriceChange24h(
      typeof asset.change24h === "number"
        ? asset.change24h
        : typeof asset.changePercent === "number"
          ? asset.changePercent
          : null,
    );
    setIsLivePriced(hasQuote);
    setCurrentPriceOriginal(
      typeof asset.priceUsd === "number" && Number.isFinite(asset.priceUsd)
        ? asset.priceUsd
        : null,
    );
    setCurrentPriceCurrency(
      typeof asset.priceUsd === "number" && Number.isFinite(asset.priceUsd)
        ? "USD"
        : "PKR",
    );
    setCurrentPrice(hasQuote && asset.pricePkr ? asset.pricePkr.toFixed(2) : "");
    setPurchaseCurrency(asset.kind === "stock" ? "USD" : purchaseCurrency);
    setQuery(asset.name);
    setSearchFocused(false);
    setResults([]);
    setError("");
  }

  function handleClearSearch() {
    setQuery("");
    clearMarketSelection();
    setResults([]);
    setSearchError("");
    setSearchFocused(false);
  }

  function handleTypeChange(nextType: string) {
    setType(nextType);

    if (!isEditing || nextType !== "crypto") {
      clearMarketSelection();
    }
  }

  async function handleSave() {
    const assetName = name.trim();
    const parsedQuantity = parseNumber(quantity);
    const parsedPurchasePrice = parseNumber(purchasePrice);
    const parsedCurrentPrice = currentPrice ? parseNumber(currentPrice) : null;
    const purchaseDate = purchasedAt.trim();

    if (!assetName) {
      setError("Enter an asset name.");
      return;
    }

    if (parsedQuantity === null || parsedQuantity <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }

    if (parsedPurchasePrice === null || parsedPurchasePrice <= 0) {
      setError("Enter a buy price greater than 0.");
      return;
    }

    if (!marketPricedSelected && parsedCurrentPrice !== null && parsedCurrentPrice <= 0) {
      setError("Enter a current price greater than 0, or leave it blank.");
      return;
    }

    if (!accountId) {
      setError("Choose the account used to buy this investment.");
      return;
    }

    if (!isValidDateKey(purchaseDate)) {
      setError("Enter a valid purchase date.");
      return;
    }

    if (
      marketPricedSelected &&
      (typeof marketPricePkr !== "number" ||
        !Number.isFinite(marketPricePkr) ||
        marketPricePkr <= 0)
    ) {
      setError(
        "Market price is unavailable for this asset. Enter a manual current price or choose another asset.",
      );
      return;
    }

    setLoading(true);
    setError("");

    const needsUsdConversion =
      purchaseCurrency === "USD" ||
      (!marketPricedSelected &&
        parsedCurrentPrice !== null &&
        currentPriceCurrency === "USD");

    let usdPkrRate = 1;

    if (needsUsdConversion) {
      try {
        usdPkrRate = await getUsdPkrRateForSave();
      } catch (rateError) {
        setLoading(false);
        setError(
          rateError instanceof Error
            ? rateError.message
            : "USD to PKR rate is unavailable right now.",
        );
        return;
      }
    }

    const purchasePricePkr =
      purchaseCurrency === "USD"
        ? parsedPurchasePrice * usdPkrRate
        : parsedPurchasePrice;

    if (!Number.isFinite(purchasePricePkr) || purchasePricePkr <= 0) {
      setLoading(false);
      setError("Buy price could not be converted safely. Try again.");
      return;
    }

    let currentPricePkr = purchasePricePkr;
    let currentOriginalPrice: number | null = parsedPurchasePrice;
    let savedCurrentCurrency: CurrencyCode = purchaseCurrency;

    if (marketPricedSelected) {
      currentPricePkr = marketPricePkr as number;
      currentOriginalPrice =
        typeof marketPriceUsd === "number" && Number.isFinite(marketPriceUsd)
          ? marketPriceUsd
          : null;
      savedCurrentCurrency = currentOriginalPrice === null ? "PKR" : "USD";
    } else if (parsedCurrentPrice !== null) {
      currentPricePkr =
        currentPriceCurrency === "USD"
          ? parsedCurrentPrice * usdPkrRate
          : parsedCurrentPrice;
      currentOriginalPrice = parsedCurrentPrice;
      savedCurrentCurrency = currentPriceCurrency;
    }

    if (!Number.isFinite(currentPricePkr) || currentPricePkr <= 0) {
      setLoading(false);
      setError("Current price could not be saved safely. Try again.");
      return;
    }

    const { error: saveError } = await supabase.rpc(
      "save_investment_purchase",
      {
        p_investment_id: investment?.id ?? null,
        p_name: assetName,
        p_type: type,
        p_quantity: parsedQuantity,
        p_purchase_price: purchasePricePkr,
        p_purchase_price_original: parsedPurchasePrice,
        p_purchase_currency: purchaseCurrency,
        p_current_price: currentPricePkr,
        p_current_price_original: currentOriginalPrice,
        p_current_price_currency: savedCurrentCurrency,
        p_purchased_at: purchaseDate,
        p_asset_id: assetId,
        p_symbol: symbol,
        p_image_url: imageUrl,
        p_price_source: priceSource,
        p_price_currency: "PKR",
        p_price_updated_at: priceUpdatedAt,
        p_price_change_24h: priceChange24h,
        p_is_live_priced: isLivePriced,
        p_account_id: accountId,
      },
    );

    setLoading(false);

    if (saveError) {
      setError(saveError.message || "Failed to save. Try again.");
      toast.error("Failed to save investment");
      return;
    }
    toast.success(isEditing ? "Investment updated!" : "Investment added!");
    onSuccess();
    onClose();
  }

  function renderAssetAvatar(asset: MarketSearchResult) {
    if (asset.logoUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.logoUrl} alt="" className="h-8 w-8 rounded-full" />
      );
    }

    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-secondary text-xs font-bold text-active">
        {getAssetInitials(asset.name, asset.symbol)}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${financeModalContentClass} sm:max-w-lg`}>
        <FinanceModalHeader
          title={isEditing ? "Edit Investment" : "Add Investment"}
          description="Enter asset details, pricing, and purchase date."
          icon={BriefcaseBusiness}
          tone="investment"
        />

        <FinanceModalBody>
          {!isEditing && !manualMode ? (
            <div className="space-y-3">
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
                      if (selectedAsset || assetId) clearMarketSelection();
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSearchFocused(false);
                      }
                    }}
                    placeholder="Search crypto or stocks e.g. Bitcoin, Apple, AAPL"
                    className="field-input pl-9 pr-10"
                    autoComplete="off"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="finance-focus absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                      aria-label="Clear asset search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {showSearchDropdown ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 rounded-[16px] border border-border bg-card p-1.5 shadow-premium">
                    {searchLoading ? (
                      <div className="flex items-center justify-center gap-2 px-2 py-4 text-xs font-medium text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching assets...
                      </div>
                    ) : results.length === 0 ? (
                      <div className="px-2 py-4 text-center text-xs">
                        <p className="text-text-secondary">No assets found.</p>
                        {searchError ? (
                          <p className="mt-1 text-danger">{searchError}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="max-h-[286px] overflow-y-auto pr-1">
                        {groupedResults.map((group) =>
                          group.items.length > 0 ? (
                            <div key={group.label} className="py-1">
                              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary">
                                {group.label}
                              </p>
                              {group.items.map((asset) => {
                                const changeText = formatMarketChange(asset);
                                const changeValue =
                                  asset.kind === "crypto"
                                    ? asset.change24h
                                    : asset.changePercent;
                                const isPositive =
                                  typeof changeValue === "number" &&
                                  changeValue >= 0;

                                return (
                                  <button
                                    key={`${asset.kind}-${asset.id}`}
                                    type="button"
                                    onClick={() => handleSelectAsset(asset)}
                                    className="finance-focus flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-hover"
                                  >
                                    {renderAssetAvatar(asset)}
                                    <span className="min-w-0 flex-1">
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-text-primary">
                                          {asset.name}
                                        </span>
                                        <span className="text-[11px] font-bold uppercase text-text-secondary">
                                          {asset.symbol}
                                        </span>
                                      </span>
                                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                                        <span>{formatPkr(asset.pricePkr)}</span>
                                        <span>{formatUsd(asset.priceUsd)}</span>
                                        {changeText ? (
                                          <span
                                            className={
                                              isPositive
                                                ? "text-success"
                                                : "text-danger"
                                            }
                                          >
                                            {changeText}
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                    <span className="rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">
                                      {asset.kind === "crypto" ? "Crypto" : "Stock"}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null,
                        )}
                        {searchError ? (
                          <p className="px-2 py-2 text-[11px] text-warning">
                            {searchError}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleManualMode}
                className="text-xs font-semibold text-active transition-colors hover:text-active-hover"
              >
                Can't find asset? Add manually
              </button>
            </div>
          ) : (
            <FinanceFormField label="Asset Name" htmlFor="investment-name">
              <Input
                id="investment-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!isEditing) clearMarketSelection();
                }}
                placeholder="e.g. Bitcoin, Apple Stock"
              />
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    setQuery("");
                    clearMarketSelection();
                  }}
                  className="mt-2 text-xs font-semibold text-active transition-colors hover:text-active-hover"
                >
                  Search crypto or stocks instead
                </button>
              ) : null}
            </FinanceFormField>
          )}

          {selectedAsset ? (
            <div className="rounded-[18px] border border-success/25 bg-success/10 p-3">
              <div className="flex items-start gap-3">
                {selectedAsset.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedAsset.logoUrl}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-full"
                  />
                ) : (
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-surface-secondary text-xs font-bold text-active">
                    {getAssetInitials(selectedAsset.name, selectedAsset.symbol)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {selectedAsset.name}{" "}
                        <span className="text-xs uppercase text-text-secondary">
                          {selectedAsset.symbol}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">
                          {selectedAsset.kind === "crypto" ? "Crypto" : "Stock"}
                        </span>
                        <p className="text-[11px] font-medium text-text-secondary">
                          {selectedAsset.sourceLabel}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFocused(true);
                        setQuery("");
                        clearMarketSelection();
                      }}
                      className="finance-focus rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-text-primary transition-colors hover:bg-hover"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-sm font-bold text-text-primary">
                      {formatPkr(selectedAsset.pricePkr)}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {formatUsd(selectedAsset.priceUsd)}
                    </span>
                    {formatMarketChange(selectedAsset) ? (
                      <span
                        className={`text-[11px] font-semibold ${
                          Number(
                            selectedAsset.change24h ??
                              selectedAsset.changePercent ??
                              0,
                          ) >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {formatMarketChange(selectedAsset)}
                      </span>
                    ) : null}
                  </div>
                  {!hasPkrPrice(selectedAsset) ? (
                    <p className="mt-2 text-[11px] text-warning">
                      Quote unavailable. Enter a manual current price below.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {(manualMode || isEditing) && (
            <div>
              <label className="field-label">Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleTypeChange(item.value)}
                    aria-pressed={type === item.value}
                    className={`finance-focus min-h-11 rounded-[16px] border px-3 py-2 text-sm font-semibold transition-colors ${
                      type === item.value
                        ? "border-border bg-card text-text-primary shadow-theme"
                        : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FinanceFormField label="Quantity" htmlFor="investment-quantity">
              <Input
                id="investment-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
              />
            </FinanceFormField>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="field-label mb-0" htmlFor="investment-purchase-price">
                  Buy Price ({purchaseCurrency})
                </label>
                <div className="grid grid-cols-2 rounded-full border border-border bg-surface-secondary p-0.5">
                  {(["PKR", "USD"] as CurrencyCode[]).map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setPurchaseCurrency(currency)}
                      aria-pressed={purchaseCurrency === currency}
                      className={`finance-focus rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${
                        purchaseCurrency === currency
                          ? "bg-card text-text-primary shadow-theme"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="investment-purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {marketPricedSelected ? (
            <div className="rounded-[18px] border border-border bg-surface-secondary p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-secondary">
                    {marketPriceLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-text-primary">
                    {formatPkr(marketPricePkr)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {formatUsd(marketPriceUsd)}
                  </p>
                </div>
                {priceChange24h !== null ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      Number(priceChange24h) >= 0
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-danger/25 bg-danger/10 text-danger"
                    }`}
                  >
                    {priceChange24h >= 0 ? "+" : ""}
                    {priceChange24h.toFixed(2)}%
                    {priceSource === "coingecko" ? " 24h" : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-text-secondary">
                {marketSourceLabel}. This value is saved in {BASE_CURRENCY} for portfolio math.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="field-label mb-0" htmlFor="investment-current-price">
                  Current Price ({currentPriceCurrency})
                </label>
                <div className="grid grid-cols-2 rounded-full border border-border bg-surface-secondary p-0.5">
                  {(["PKR", "USD"] as CurrencyCode[]).map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setCurrentPriceCurrency(currency)}
                      aria-pressed={currentPriceCurrency === currency}
                      className={`finance-focus rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${
                        currentPriceCurrency === currency
                          ? "bg-card text-text-primary shadow-theme"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                id="investment-current-price"
                type="number"
                value={currentPrice}
                onChange={(event) => {
                  setCurrentPrice(event.target.value);
                  if (!isEditing && manualMode) clearMarketSelection();
                }}
                placeholder="Leave blank to match buy price"
              />
            </div>
          )}

          <FinanceFormField label="Paid From Account">
            <AccountSelect
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="Add an account before buying investments"
            />
            {isEditing ? (
              <p className="mt-2 text-[11px] leading-4 text-text-secondary">
                This keeps the linked purchase transaction and account balance in sync.
              </p>
            ) : null}
          </FinanceFormField>

          <FinanceFormField label="Purchase Date" htmlFor="investment-purchased-at">
            <DatePicker
              id="investment-purchased-at"
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Investment purchase date"
            />
          </FinanceFormField>

          {error && <p className={financeErrorClass}>{error}</p>}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || loadingOptions}
            className="primary-action py-3"
          >
            {loading || loadingOptions
              ? loadingOptions
                ? "Loading..."
                : "Saving..."
              : isEditing
                ? "Update Investment"
                : "Add Investment"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
