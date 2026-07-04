"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { getAppDateKey } from "@/lib/dates";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import type { CryptoPrice, CryptoSearchResult } from "@/lib/market/crypto";

const TYPES = [
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
  { value: "savings", label: "Savings" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

type SearchResponse = {
  results?: CryptoSearchResult[];
  error?: string;
};

type PriceResponse = {
  prices?: Record<string, CryptoPrice>;
};

type ExchangeRateResponse = {
  rate?: number;
};

type CurrencyCode = "PKR" | "USD";

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
  if (typeof value !== "number" || !Number.isFinite(value)) return "Price unavailable";

  return `PKR ${value.toLocaleString("en-PK", {
    maximumFractionDigits: value >= 100 ? 0 : 4,
  })}`;
}

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "USD unavailable";

  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 1 ? 2 : 6,
  })}`;
}

function formatChange(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "24h unavailable";

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}% 24h`;
}

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  return value === "USD" ? "USD" : "PKR";
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
  const supabase = createClient();
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
  const [manualMode, setManualMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CryptoSearchResult[]>([]);
  const [resultPrices, setResultPrices] = useState<Record<string, CryptoPrice>>({});
  const [selectedAsset, setSelectedAsset] = useState<CryptoSearchResult | null>(
    null,
  );
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPrice = useMemo(
    () => (selectedAsset ? resultPrices[selectedAsset.id] : null),
    [resultPrices, selectedAsset],
  );
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
  const liveCryptoSelected =
    type === "crypto" &&
    isLivePriced &&
    priceSource === "coingecko" &&
    Boolean(assetId) &&
    !manualMode;
  const livePricePkr = selectedPrice?.pkr ?? parseNumber(currentPrice);
  const livePriceUsd = selectedPrice?.usd ?? currentPriceOriginal;

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
      setManualMode(false);
      setQuery("");
      setSelectedAsset(null);
    }
    setResults([]);
    setResultPrices({});
    setSearchFocused(false);
    setSearchError("");
    setError("");
  }, [open, investment]);

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
          `/api/market/crypto/search?q=${encodeURIComponent(cleanQuery)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Crypto search is unavailable.");
        }

        const nextResults = data.results ?? [];
        setResults(nextResults);

        if (nextResults.length === 0) {
          setResultPrices({});
          return;
        }

        const priceResponse = await fetch(
          `/api/market/crypto/price?ids=${encodeURIComponent(
            nextResults.map((asset) => asset.id).join(","),
          )}`,
          { signal: controller.signal },
        );
        const priceData = (await priceResponse.json()) as PriceResponse;

        setResultPrices(priceResponse.ok ? priceData.prices ?? {} : {});
      } catch (searchException) {
        if (searchException instanceof DOMException && searchException.name === "AbortError") {
          return;
        }

        setResults([]);
        setResultPrices({});
        setSearchError(
          searchException instanceof Error
            ? searchException.message
            : "Crypto search is unavailable.",
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

  function clearLivePricing() {
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
    clearLivePricing();
    setResults([]);
    setResultPrices({});
    setSearchFocused(false);
    setSearchError("");
  }

  function handleSelectAsset(asset: CryptoSearchResult) {
    const price = resultPrices[asset.id];

    setSelectedAsset(asset);
    setName(asset.name);
    setType("crypto");
    setAssetId(asset.id);
    setSymbol(asset.symbol);
    setImageUrl(asset.large ?? asset.thumb);
    setPriceSource("coingecko");
    setPriceUpdatedAt(price?.lastUpdatedAt ?? null);
    setPriceChange24h(price?.change24h ?? null);
    setIsLivePriced(true);
    setCurrentPriceOriginal(
      typeof price?.usd === "number" && Number.isFinite(price.usd)
        ? price.usd
        : null,
    );
    setCurrentPriceCurrency("USD");
    setCurrentPrice(
      typeof price?.pkr === "number" && Number.isFinite(price.pkr)
        ? price.pkr.toFixed(2)
        : "",
    );
    setQuery(asset.name);
    setSearchFocused(false);
    setResults([]);
    setError("");
  }

  function handleClearSearch() {
    setQuery("");
    clearLivePricing();
    setResults([]);
    setResultPrices({});
    setSearchError("");
    setSearchFocused(false);
  }

  function handleTypeChange(nextType: string) {
    setType(nextType);

    if (!isEditing || nextType !== "crypto") {
      clearLivePricing();
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

    if (!liveCryptoSelected && parsedCurrentPrice !== null && parsedCurrentPrice <= 0) {
      setError("Enter a current price greater than 0, or leave it blank.");
      return;
    }

    if (!isValidDateKey(purchaseDate)) {
      setError("Enter a valid purchase date.");
      return;
    }

    if (
      liveCryptoSelected &&
      (typeof livePricePkr !== "number" ||
        !Number.isFinite(livePricePkr) ||
        livePricePkr <= 0)
    ) {
      setError(
        "Live price is unavailable for this coin. Use manual pricing or choose another asset.",
      );
      return;
    }

    setLoading(true);
    setError("");

    const needsUsdConversion =
      purchaseCurrency === "USD" ||
      (!liveCryptoSelected &&
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

    if (liveCryptoSelected) {
      currentPricePkr = livePricePkr as number;
      currentOriginalPrice =
        typeof livePriceUsd === "number" && Number.isFinite(livePriceUsd)
          ? livePriceUsd
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Please sign in again before saving this investment.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: assetName,
      type,
      quantity: parsedQuantity,
      purchase_price: purchasePricePkr,
      purchase_price_original: parsedPurchasePrice,
      purchase_currency: purchaseCurrency,
      current_price: currentPricePkr,
      current_price_original: currentOriginalPrice,
      current_price_currency: savedCurrentCurrency,
      purchased_at: purchaseDate,
      asset_id: assetId,
      symbol,
      image_url: imageUrl,
      price_source: priceSource,
      price_currency: "PKR",
      price_updated_at: priceUpdatedAt,
      price_change_24h: priceChange24h,
      is_live_priced: isLivePriced,
    };

    const { error: saveError } = isEditing
      ? await supabase
          .from("investments")
          .update(payload)
          .eq("id", investment!.id)
      : await supabase.from("investments").insert(payload);

    setLoading(false);

    if (saveError) {
      setError("Failed to save. Try again.");
      toast.error("Failed to save investment");
      return;
    }
    toast.success(isEditing ? "Investment updated!" : "Investment added!");
    onSuccess();
    onClose();
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
                  Search Crypto Asset
                </label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    id="investment-asset-search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSearchFocused(true);
                      if (selectedAsset || assetId) clearLivePricing();
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setSearchFocused(false);
                      }
                    }}
                    placeholder="Search bitcoin, ethereum..."
                    className="field-input pl-9 pr-10"
                    autoComplete="off"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="finance-focus absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                      aria-label="Clear crypto search"
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
                        Searching live assets...
                      </div>
                    ) : searchError ? (
                      <p className="px-2 py-4 text-center text-xs text-danger">
                        {searchError}
                      </p>
                    ) : results.length === 0 ? (
                      <p className="px-2 py-4 text-center text-xs text-text-secondary">
                        No crypto assets found.
                      </p>
                    ) : (
                      <div className="max-h-[240px] overflow-y-auto pr-1">
                        {results.map((asset) => {
                          const price = resultPrices[asset.id];
                          const change = price?.change24h;
                          const isPositive =
                            typeof change === "number" && change >= 0;

                          return (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => handleSelectAsset(asset)}
                              className="finance-focus flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-hover"
                            >
                              {asset.thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={asset.thumb}
                                  alt=""
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-secondary text-xs font-bold text-active">
                                  {asset.symbol.slice(0, 1)}
                                </span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-text-primary">
                                    {asset.name}
                                  </span>
                                  <span className="text-[11px] font-bold uppercase text-text-secondary">
                                    {asset.symbol}
                                  </span>
                                </span>
                                <span className="mt-0.5 flex items-center gap-2 text-[11px] text-text-secondary">
                                  <span>{formatPkr(price?.pkr)}</span>
                                  {typeof change === "number" ? (
                                    <span
                                      className={
                                        isPositive ? "text-success" : "text-danger"
                                      }
                                    >
                                      {isPositive ? "+" : ""}
                                      {change.toFixed(2)}%
                                    </span>
                                  ) : null}
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

              <button
                type="button"
                onClick={handleManualMode}
                className="text-xs font-semibold text-active transition-colors hover:text-active-hover"
              >
                Can't find asset? Add manually
              </button>
            </div>
          ) : (
            <div>
              <label className="field-label" htmlFor="investment-name">
                Asset Name
              </label>
              <input
                id="investment-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!isEditing) clearLivePricing();
                }}
                placeholder="e.g. Bitcoin, Apple Stock"
                className="field-input"
              />
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setManualMode(false);
                    setQuery("");
                    clearLivePricing();
                  }}
                  className="mt-2 text-xs font-semibold text-active transition-colors hover:text-active-hover"
                >
                  Search live crypto instead
                </button>
              ) : null}
            </div>
          )}

          {selectedAsset ? (
            <div className="rounded-[18px] border border-success/25 bg-success/10 p-3">
              <div className="flex items-start gap-3">
              {selectedAsset.large ?? selectedAsset.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAsset.large ?? selectedAsset.thumb ?? ""}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-full"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {selectedAsset.name}{" "}
                        <span className="text-xs uppercase text-text-secondary">
                          {selectedAsset.symbol}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-text-secondary">
                        Live via CoinGecko
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchFocused(true);
                        setQuery("");
                        clearLivePricing();
                      }}
                      className="finance-focus rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-text-primary transition-colors hover:bg-hover"
                    >
                      Change
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-sm font-bold text-text-primary">
                      {formatPkr(selectedPrice?.pkr)}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {formatUsd(selectedPrice?.usd)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        Number(selectedPrice?.change24h ?? 0) >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {formatChange(selectedPrice?.change24h)}
                    </span>
                  </div>
                  {typeof selectedPrice?.pkr !== "number" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-danger">
                      <span>Live price is unavailable for this coin.</span>
                      <button
                        type="button"
                        onClick={handleManualMode}
                        className="font-semibold text-active transition-colors hover:text-active-hover"
                      >
                        Use manual pricing
                      </button>
                    </div>
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
            <div>
              <label className="field-label" htmlFor="investment-quantity">
                Quantity
              </label>
              <input
                id="investment-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="field-input"
              />
            </div>
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
              <input
                id="investment-purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                className="field-input"
              />
            </div>
          </div>

          {liveCryptoSelected ? (
            <div className="rounded-[18px] border border-border bg-surface-secondary p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-text-secondary">
                    Current live price
                  </p>
                  <p className="mt-1 text-sm font-bold text-text-primary">
                    {formatPkr(livePricePkr)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {formatUsd(livePriceUsd)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    Number(priceChange24h ?? selectedPrice?.change24h ?? 0) >= 0
                      ? "border-success/25 bg-success/10 text-success"
                      : "border-danger/25 bg-danger/10 text-danger"
                  }`}
                >
                  {formatChange(priceChange24h ?? selectedPrice?.change24h)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-text-secondary">
                Live via CoinGecko. This value is saved in PKR for portfolio math.
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
              <input
                id="investment-current-price"
                type="number"
                value={currentPrice}
                onChange={(event) => {
                  setCurrentPrice(event.target.value);
                  if (!isEditing && manualMode) clearLivePricing();
                }}
                placeholder="Leave blank to match buy price"
                className="field-input"
              />
            </div>
          )}

          <div>
            <label className="field-label" htmlFor="investment-purchased-at">
              Purchase Date
            </label>
            <DatePicker
              id="investment-purchased-at"
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Investment purchase date"
            />
          </div>

          {error && <p className={financeErrorClass}>{error}</p>}
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="primary-action py-3"
          >
            {loading ? "Saving..." : isEditing ? "Update Investment" : "Add Investment"}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
