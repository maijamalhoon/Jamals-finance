"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import { normalizeInvestmentEditorType } from "@/lib/investments/type-normalization";
import { loadSearchableCryptoCatalog } from "@/lib/market/crypto-search-catalog-client";

import InvestmentModalUniversal from "./InvestmentModalUniversal";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalUniversal>;

type CryptoLogoPayload = {
  prices?: Record<
    string,
    {
      imageUrl?: unknown;
    }
  >;
};

type AssetRowIdentity = {
  providerId: string;
  symbol: string;
  type: string;
  name: string;
};

const CRYPTO_LOGO_CACHE = new Map<string, string>();
const LOGO_REFRESH_DELAY_MS = 80;

function getAssetRowIdentity(row: HTMLElement): AssetRowIdentity | null {
  const assetId = row.id.replace(/^investment-asset-/, "").trim().toLowerCase();
  const content = row.children.item(1);
  const name = content?.firstElementChild?.textContent?.trim() ?? "";
  const metadata = content?.lastElementChild;
  const symbol = metadata?.children.item(0)?.textContent?.trim().toUpperCase() ?? "";
  const type = metadata?.children.item(2)?.textContent?.trim().toLowerCase() ?? "";

  if (!assetId || !symbol || !type) return null;

  const providerId = assetId.startsWith("crypto-")
    ? assetId.slice("crypto-".length)
    : assetId;
  if (type !== "crypto" || !/^[a-z0-9-]{1,100}$/.test(providerId)) return null;

  return { providerId, symbol, type, name };
}

function isKnownWeakCryptoLogo(source: string) {
  return (
    source.includes("cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons") ||
    source.includes("raw.githubusercontent.com/spothq/cryptocurrency-icons")
  );
}

function installProviderLogo(
  row: HTMLElement,
  identity: AssetRowIdentity,
  source: string,
) {
  const avatar = row.firstElementChild;
  if (!(avatar instanceof HTMLElement) || !source) return;

  avatar.style.background = "transparent";
  avatar.style.boxShadow = "none";
  avatar.style.color = "transparent";
  avatar.setAttribute("aria-hidden", "true");

  if (avatar instanceof HTMLImageElement) {
    if (avatar.src === source && avatar.dataset.marketProviderLogo === "true") {
      avatar.style.opacity = "1";
      return;
    }

    avatar.dataset.marketProviderLogo = "true";
    avatar.alt = `${identity.name || identity.symbol} logo`;
    avatar.loading = "eager";
    avatar.decoding = "async";
    avatar.style.opacity = "1";
    avatar.style.background = "transparent";
    avatar.src = source;
    return;
  }

  const image = document.createElement("img");
  image.dataset.marketProviderLogo = "true";
  image.src = source;
  image.alt = `${identity.name || identity.symbol} logo`;
  image.loading = "eager";
  image.decoding = "async";
  image.width = 40;
  image.height = 40;
  image.style.width = "100%";
  image.style.height = "100%";
  image.style.objectFit = "contain";
  image.style.background = "transparent";

  avatar.replaceChildren(image);
}

function useInvestmentAssetLogoRecovery(open: boolean) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    let stopped = false;
    let refreshTimer: number | null = null;
    let requestController: AbortController | null = null;
    let requestInFlight = false;
    let refreshRequestedDuringFlight = false;

    function getRows() {
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          '#investment-asset-results [role="option"]',
        ),
      );
    }

    function applyCachedLogos(rows: readonly HTMLElement[]) {
      const missingIds = new Set<string>();

      for (const row of rows) {
        const identity = getAssetRowIdentity(row);
        if (!identity) continue;

        const cached = CRYPTO_LOGO_CACHE.get(identity.providerId);
        if (cached) {
          installProviderLogo(row, identity, cached);
          continue;
        }

        const avatar = row.firstElementChild;
        const currentSource =
          avatar instanceof HTMLImageElement ? avatar.currentSrc || avatar.src : "";
        const isInitialsFallback = avatar instanceof HTMLElement && !(avatar instanceof HTMLImageElement);

        if (isInitialsFallback || !currentSource || isKnownWeakCryptoLogo(currentSource)) {
          missingIds.add(identity.providerId);
        }
      }

      return Array.from(missingIds).sort();
    }

    async function refreshLogos() {
      if (stopped) return;
      if (requestInFlight) {
        refreshRequestedDuringFlight = true;
        return;
      }

      const rows = getRows();
      const missingIds = applyCachedLogos(rows);
      if (missingIds.length === 0) return;

      requestInFlight = true;
      refreshRequestedDuringFlight = false;
      requestController = new AbortController();

      try {
        const parameters = new URLSearchParams({ ids: missingIds.join(",") });
        const response = await fetch(`/api/market/crypto/price?${parameters}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: requestController.signal,
        });
        const payload = (await response.json()) as CryptoLogoPayload;
        if (!response.ok || !payload.prices) return;

        for (const id of missingIds) {
          const imageUrl = payload.prices[id]?.imageUrl;
          if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
            CRYPTO_LOGO_CACHE.set(id, imageUrl);
          }
        }

        if (!stopped) applyCachedLogos(getRows());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("[investment-logos] Provider logo refresh unavailable");
        }
      } finally {
        requestInFlight = false;
        requestController = null;
        if (!stopped && refreshRequestedDuringFlight) scheduleRefresh();
      }
    }

    function scheduleRefresh() {
      if (stopped) return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshLogos();
      }, LOGO_REFRESH_DELAY_MS);
    }

    function handleImageError(event: Event) {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      const row = image.closest<HTMLElement>(
        '#investment-asset-results [role="option"]',
      );
      if (!row) return;

      const identity = getAssetRowIdentity(row);
      if (!identity) return;

      event.preventDefault();
      event.stopPropagation();
      image.style.opacity = "0";
      image.style.background = "transparent";

      const cached = CRYPTO_LOGO_CACHE.get(identity.providerId);
      if (cached && image.src !== cached) {
        installProviderLogo(row, identity, cached);
        return;
      }

      scheduleRefresh();
    }

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("error", handleImageError, true);
    scheduleRefresh();

    return () => {
      stopped = true;
      observer.disconnect();
      document.removeEventListener("error", handleImageError, true);
      requestController?.abort();
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
    };
  }, [open]);
}

export default function InvestmentModal(props: InvestmentModalProps) {
  const [catalogVersion, setCatalogVersion] = useState(0);
  const openRef = useRef(props.open);
  const pendingCatalogRefreshRef = useRef(false);
  const normalizedInvestment = useMemo(() => {
    if (!props.investment) return undefined;

    const normalizedType = normalizeInvestmentEditorType(props.investment.type);
    if (normalizedType === props.investment.type) return props.investment;

    return { ...props.investment, type: normalizedType };
  }, [props.investment]);

  useInvestmentAssetLogoRecovery(props.open);

  useEffect(() => {
    openRef.current = props.open;

    if (!props.open && pendingCatalogRefreshRef.current) {
      pendingCatalogRefreshRef.current = false;
      setCatalogVersion(1);
    }
  }, [props.open]);

  useEffect(() => {
    let active = true;

    void loadSearchableCryptoCatalog().then((assets) => {
      if (!active || assets.length === 0) return;

      if (openRef.current) {
        pendingCatalogRefreshRef.current = true;
        return;
      }

      setCatalogVersion(1);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <InvestmentModalUniversal
        key={catalogVersion}
        {...props}
        investment={normalizedInvestment}
      />
      <style jsx global>{`
        #investment-asset-results [role="option"] > :first-child {
          background: transparent !important;
          box-shadow: none !important;
        }

        #investment-asset-results
          [role="option"]
          > :nth-child(2)
          > :last-child
          > :nth-child(n + 4) {
          display: none !important;
        }

        @media (max-width: 639px) {
          #investment-asset-results {
            max-height: min(18rem, 40dvh);
            overflow: hidden;
          }

          #investment-asset-results > div {
            max-height: min(17rem, 38dvh) !important;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }

          #investment-asset-results [role="option"] {
            display: grid !important;
            grid-template-columns: 2.5rem minmax(0, 1fr) minmax(6.5rem, 8.75rem);
            align-items: center;
            column-gap: 0.625rem !important;
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }

          #investment-asset-results [role="option"] > :first-child {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }

          #investment-asset-results [role="option"] > :nth-child(2) {
            min-width: 0;
            overflow: hidden;
          }

          #investment-asset-results [role="option"] > :nth-child(2) > :first-child {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          #investment-asset-results [role="option"] > :nth-child(2) > :last-child {
            display: flex !important;
            min-width: 0;
            flex-wrap: nowrap !important;
            gap: 0.3rem !important;
            overflow: hidden;
            white-space: nowrap;
            font-size: 9px !important;
            line-height: 1rem;
            letter-spacing: 0.035em !important;
          }

          #investment-asset-results [role="option"] > :nth-child(2) > :last-child > span {
            flex: 0 0 auto;
            white-space: nowrap;
          }

          #investment-asset-results [role="option"] > :last-child {
            min-width: 0;
            max-width: 8.75rem;
            overflow: hidden;
            white-space: nowrap;
          }

          #investment-asset-results [role="option"] > :last-child > span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          #investment-asset-results [role="option"] > :last-child > :first-child {
            font-size: 10px !important;
            line-height: 1rem;
          }
        }

        @media (max-width: 380px) {
          #investment-asset-results [role="option"] {
            grid-template-columns: 2.25rem minmax(0, 1fr) minmax(5.75rem, 7.25rem);
            column-gap: 0.5rem !important;
          }

          #investment-asset-results [role="option"] > :first-child {
            width: 2.25rem !important;
            height: 2.25rem !important;
          }

          #investment-asset-results [role="option"] > :last-child > :first-child {
            font-size: 9px !important;
          }
        }
      `}</style>
    </>
  );
}
