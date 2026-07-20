"use client";

import { useEffect, useState, type ComponentProps } from "react";

import InvestmentModalLocal from "./InvestmentModalLocal";
import { createClient } from "@/lib/supabase/client";
import {
  CRYPTO_CATALOG,
  type CryptoCatalogAsset,
} from "@/lib/market/crypto-catalog";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalLocal>;

type CryptoAssetRow = {
  id: string;
  name: string;
  symbol: string;
  aliases: string[] | null;
  logo_url: string;
  rank: number;
  binance_symbol: string | null;
};

let cryptoCatalogRequest: Promise<CryptoCatalogAsset[] | null> | null = null;

function loadCryptoCatalogOnce() {
  if (cryptoCatalogRequest) return cryptoCatalogRequest;

  cryptoCatalogRequest = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("crypto_assets")
      .select("id, name, symbol, aliases, logo_url, rank, binance_symbol")
      .eq("is_active", true)
      .order("rank", { ascending: true });

    if (error || !data?.length) return null;

    return (data as CryptoAssetRow[]).map((asset) => ({
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol.toUpperCase(),
      aliases: Array.isArray(asset.aliases)
        ? asset.aliases.filter(
            (alias): alias is string => typeof alias === "string",
          )
        : [],
      logoUrl: asset.logo_url,
      rank: asset.rank,
      binanceSymbol: asset.binance_symbol,
    }));
  })();

  return cryptoCatalogRequest;
}

export default function InvestmentModal(props: InvestmentModalProps) {
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    let active = true;

    void loadCryptoCatalogOnce().then((assets) => {
      if (!active || !assets?.length) return;

      const runtimeCatalog =
        CRYPTO_CATALOG as unknown as CryptoCatalogAsset[];
      runtimeCatalog.splice(0, runtimeCatalog.length, ...assets);
      setCatalogVersion(1);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <InvestmentModalLocal key={catalogVersion} {...props} />
      <style jsx global>{`
        @media (max-width: 639px) {
          #investment-crypto-results {
            max-height: min(18rem, 40dvh);
            overflow: hidden;
          }

          #investment-crypto-results > div {
            max-height: min(17rem, 38dvh) !important;
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </>
  );
}
