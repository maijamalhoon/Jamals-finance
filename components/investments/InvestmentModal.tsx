"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, Loader2, Search } from "lucide-react";
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

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function formatPkr(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Price unavailable";

  return `PKR ${value.toLocaleString("en-PK", {
    maximumFractionDigits: value >= 100 ? 0 : 4,
  })}`;
}

export interface ExistingInvestment {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
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

  const [name, setName] = useState("");
  const [type, setType] = useState("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(getAppDateKey());
  const [assetId, setAssetId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState("manual");
  const [priceCurrency, setPriceCurrency] = useState("PKR");
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPrice = useMemo(
    () => (selectedAsset ? resultPrices[selectedAsset.id] : null),
    [resultPrices, selectedAsset],
  );

  useEffect(() => {
    if (!open) return;
    if (investment) {
      setName(investment.name);
      setType(investment.type);
      setQuantity(String(investment.quantity));
      setPurchasePrice(String(investment.purchase_price));
      setCurrentPrice(String(investment.current_price));
      setPurchasedAt(investment.purchased_at);
      setAssetId(investment.asset_id ?? null);
      setSymbol(investment.symbol ?? null);
      setImageUrl(investment.image_url ?? null);
      setPriceSource(investment.price_source ?? "manual");
      setPriceCurrency(investment.price_currency ?? "PKR");
      setPriceUpdatedAt(investment.price_updated_at ?? null);
      setPriceChange24h(investment.price_change_24h ?? null);
      setIsLivePriced(Boolean(investment.is_live_priced));
      setManualMode(true);
      setQuery("");
      setSelectedAsset(null);
    } else {
      setName("");
      setType("crypto");
      setQuantity("");
      setPurchasePrice("");
      setCurrentPrice("");
      setPurchasedAt(getAppDateKey());
      setAssetId(null);
      setSymbol(null);
      setImageUrl(null);
      setPriceSource("manual");
      setPriceCurrency("PKR");
      setPriceUpdatedAt(null);
      setPriceChange24h(null);
      setIsLivePriced(false);
      setManualMode(false);
      setQuery("");
      setSelectedAsset(null);
    }
    setResults([]);
    setResultPrices({});
    setSearchError("");
    setError("");
  }, [open, investment]);

  useEffect(() => {
    if (!open || isEditing || manualMode) return;

    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      setResults([]);
      setResultPrices({});
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
  }, [isEditing, manualMode, open, query]);

  function clearLivePricing() {
    setAssetId(null);
    setSymbol(null);
    setImageUrl(null);
    setPriceSource("manual");
    setPriceCurrency("PKR");
    setPriceUpdatedAt(null);
    setPriceChange24h(null);
    setIsLivePriced(false);
    setSelectedAsset(null);
  }

  function handleManualMode() {
    setManualMode(true);
    setName((current) => current || query.trim());
    clearLivePricing();
    setResults([]);
    setResultPrices({});
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
    setPriceCurrency("PKR");
    setPriceUpdatedAt(price?.lastUpdatedAt ?? null);
    setPriceChange24h(price?.change24h ?? null);
    setIsLivePriced(true);
    setCurrentPrice(
      typeof price?.pkr === "number" && Number.isFinite(price.pkr)
        ? price.pkr.toFixed(2)
        : "",
    );
    setQuery(asset.name);
    setError("");
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

    if (parsedCurrentPrice !== null && parsedCurrentPrice < 0) {
      setError("Current price cannot be negative.");
      return;
    }

    if (!isValidDateKey(purchaseDate)) {
      setError("Enter a valid purchase date.");
      return;
    }

    setLoading(true);
    setError("");

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
      purchase_price: parsedPurchasePrice,
      current_price: parsedCurrentPrice ?? parsedPurchasePrice,
      purchased_at: purchaseDate,
      asset_id: assetId,
      symbol,
      image_url: imageUrl,
      price_source: priceSource,
      price_currency: priceCurrency,
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
              <div>
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
                      clearLivePricing();
                    }}
                    placeholder="Search bitcoin, ethereum..."
                    className="field-input pl-9"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-border bg-surface-secondary p-2">
                {query.trim().length < 2 ? (
                  <p className="px-2 py-4 text-center text-xs text-text-secondary">
                    Type at least 2 characters to search live crypto assets.
                  </p>
                ) : searchLoading ? (
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
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {results.map((asset) => {
                      const price = resultPrices[asset.id];
                      const isSelected = selectedAsset?.id === asset.id;
                      const change = price?.change24h;
                      const isPositive = typeof change === "number" && change >= 0;

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelectAsset(asset)}
                          className={`finance-focus flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-card text-text-primary shadow-theme"
                              : "hover:bg-hover"
                          }`}
                        >
                          {asset.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.thumb}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-card text-xs font-bold text-active">
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
                          {isSelected ? (
                            <Check className="h-4 w-4 flex-shrink-0 text-success" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
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
            <div className="flex items-center gap-3 rounded-[18px] border border-success/25 bg-success/10 p-3">
              {selectedAsset.large ?? selectedAsset.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedAsset.large ?? selectedAsset.thumb ?? ""}
                  alt=""
                  className="h-10 w-10 rounded-full"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {selectedAsset.name}{" "}
                  <span className="text-xs uppercase text-text-secondary">
                    {selectedAsset.symbol}
                  </span>
                </p>
                <p className="text-xs text-text-secondary">
                  Live via CoinGecko - {formatPkr(selectedPrice?.pkr)}
                </p>
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
              <label className="field-label" htmlFor="investment-purchase-price">
                Buy Price (PKR)
              </label>
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

          <div>
            <label className="field-label" htmlFor="investment-current-price">
              Current Price (PKR)
            </label>
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
              readOnly={!manualMode && !isEditing && Boolean(selectedAsset)}
            />
          </div>

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
