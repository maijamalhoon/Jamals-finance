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
import { BASE_CURRENCY, formatMoney } from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import {
  searchCryptoCatalog,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";
import { createClient } from "@/lib/supabase/client";
import { getUserMutationError } from "@/lib/user-errors";

const INVESTMENT_ACTION_COLOR = "#6849B8";

type CurrencyCode = "PKR" | "USD";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
  icon_key?: string | null;
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

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  return value === "USD" ? "USD" : "PKR";
}

function getAssetInitials(name: string, symbol?: string | null) {
  const cleanSymbol = (symbol ?? "").trim().toUpperCase();
  if (cleanSymbol) return cleanSymbol.slice(0, 2);

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "IN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function CurrencyToggle({
  value,
  onChange,
  disableUsd = false,
}: {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  disableUsd?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 rounded-[12px] border border-border bg-surface-secondary p-0.5">
      {(["PKR", "USD"] as CurrencyCode[]).map((currency) => {
        const disabled = currency === "USD" && disableUsd;
        const active = value === currency;

        return (
          <button
            key={currency}
            type="button"
            onClick={() => onChange(currency)}
            disabled={disabled}
            aria-pressed={active}
            className={`finance-focus min-h-9 min-w-12 rounded-[9px] px-2 text-[10px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              active
                ? "bg-card text-text-primary shadow-theme"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {currency}
          </button>
        );
      })}
    </div>
  );
}

function AssetAvatar({ asset }: { asset: CryptoCatalogAsset }) {
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

export default function InvestmentModalLocal({
  open,
  onClose,
  onSuccess,
  investment,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isEditing = Boolean(investment);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] =
    useState<CurrencyCode>("PKR");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currentPriceOriginal, setCurrentPriceOriginal] = useState<
    number | null
  >(null);
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
  const [selectedAsset, setSelectedAsset] =
    useState<CryptoCatalogAsset | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanQuery = query.trim();
  const isTypingAfterSelection = selectedAsset
    ? cleanQuery.toLowerCase() !== selectedAsset.name.toLowerCase()
    : true;
  const results = useMemo(
    () => searchCryptoCatalog(cleanQuery, 8),
    [cleanQuery],
  );
  const showSearchDropdown =
    !isEditing &&
    !manualMode &&
    searchFocused &&
    cleanQuery.length >= 1 &&
    (!selectedAsset || isTypingAfterSelection);
  const marketPricedSelected =
    isLivePriced &&
    (priceSource === "coingecko" || priceSource === "alpha_vantage") &&
    Boolean(assetId) &&
    !manualMode;
  const displayedCurrentPrice = marketPricedSelected
    ? currentPriceCurrency === "USD"
      ? currentPriceOriginal === null
        ? ""
        : String(currentPriceOriginal)
      : currentPrice
    : currentPrice;

  useEffect(() => {
    setActiveResultIndex(0);
  }, [cleanQuery]);

  useEffect(() => {
    if (!open) return;

    if (investment) {
      const savedPurchaseCurrency = normalizeCurrency(
        investment.purchase_currency,
      );
      const savedCurrentCurrency = normalizeCurrency(
        investment.current_price_currency,
      );
      const savedCurrentOriginal = Number(investment.current_price_original);

      setName(investment.name);
      setType(investment.type);
      setQuantity(String(investment.quantity));
      setPurchasePrice(
        savedPurchaseCurrency === "USD" &&
          investment.purchase_price_original !== null &&
          investment.purchase_price_original !== undefined
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

    setSearchFocused(false);
    setActiveResultIndex(0);
    setError("");
  }, [investment, open]);

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

  async function getUsdPkrRateForSave() {
    const response = await fetch("/api/exchange-rate");
    const data = (await response.json()) as { rate?: number };

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
    setType("other");
    setPurchaseCurrency("PKR");
    setCurrentPriceCurrency("PKR");
    clearMarketSelection();
    setCurrentPrice("");
    setSearchFocused(false);
  }

  function handleSelectAsset(asset: CryptoCatalogAsset) {
    setSelectedAsset(asset);
    setName(asset.name);
    setType("crypto");
    setAssetId(asset.id);
    setSymbol(asset.symbol);
    setImageUrl(asset.logoUrl);
    setPriceSource("catalog");
    setPriceUpdatedAt(null);
    setPriceChange24h(null);
    setIsLivePriced(false);
    setCurrentPriceOriginal(null);
    setCurrentPriceCurrency("PKR");
    setCurrentPrice("");
    setPurchaseCurrency("PKR");
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
      setError("Buying price could not be converted safely. Try again.");
      return;
    }

    let currentPricePkr = purchasePricePkr;
    let currentOriginalPrice: number | null = parsedPurchasePrice;
    let savedCurrentCurrency: CurrencyCode = purchaseCurrency;

    if (marketPricedSelected) {
      currentPricePkr = Number(currentPrice);
      currentOriginalPrice = currentPriceOriginal;
      savedCurrentCurrency = currentPriceCurrency;
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
        p_price_currency: BASE_CURRENCY,
        p_price_updated_at: priceUpdatedAt,
        p_price_change_24h: priceChange24h,
        p_is_live_priced: isLivePriced,
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
        style={
          {
            "--finance-action": INVESTMENT_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader
          title={isEditing ? "Edit Investment" : "Investment"}
        />

        <FinanceModalBody>
          {!isEditing && !manualMode ? (
            <div ref={searchContainerRef} className="relative">
              <label className="field-label" htmlFor="investment-asset-search">
                Search Crypto
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
                      setActiveResultIndex((current) => Math.max(current - 1, 0));
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const activeAsset = results[activeResultIndex];
                      if (activeAsset) handleSelectAsset(activeAsset);
                    }
                  }}
                  placeholder="Search by coin name or symbol"
                  className="pl-9 pr-10"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showSearchDropdown}
                  aria-controls="investment-crypto-results"
                  aria-activedescendant={
                    showSearchDropdown && results[activeResultIndex]
                      ? `investment-crypto-${results[activeResultIndex].id}`
                      : undefined
                  }
                />
                {query ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="finance-focus absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                    aria-label="Clear crypto search"
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
                  id="investment-crypto-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 rounded-[16px] border border-border bg-card p-1.5 shadow-premium"
                >
                  {results.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs font-semibold text-text-primary">
                        No matching coin found
                      </p>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Try another name or symbol, or add it manually.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {results.map((asset, index) => {
                        const active = index === activeResultIndex;

                        return (
                          <button
                            id={`investment-crypto-${asset.id}`}
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
                              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                                {asset.symbol}
                              </span>
                            </span>
                            <span className="flex-shrink-0 text-right">
                              <span className="block text-[11px] font-semibold text-text-secondary">
                                Price unavailable
                              </span>
                              <span className="mt-0.5 block text-[10px] font-medium text-text-secondary/75">
                                —
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
            <FinanceFormField label="Asset Name" htmlFor="investment-name">
              <Input
                id="investment-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Gold, property, private business"
              />
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
                  className="finance-focus mt-1.5 inline-flex min-h-8 items-center text-[11px] font-semibold text-active hover:text-active-hover"
                >
                  Search crypto instead
                </button>
              ) : null}
            </FinanceFormField>
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
                <CurrencyToggle
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
                <CurrencyToggle
                  value={currentPriceCurrency}
                  onChange={setCurrentPriceCurrency}
                  disableUsd={
                    marketPricedSelected && currentPriceOriginal === null
                  }
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
                placeholder="Leave blank to match buying price"
                className="font-semibold tabular-nums read-only:bg-surface-secondary read-only:text-text-secondary"
              />
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
            disabled={loading || loadingOptions}
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
