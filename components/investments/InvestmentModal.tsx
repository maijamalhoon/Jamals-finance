"use client";

import { useEffect, useState, type ComponentProps } from "react";

import { loadRuntimeCryptoCatalog } from "@/lib/market/crypto-catalog-client";

import InvestmentModalLocal from "./InvestmentModalLocal";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalLocal>;

export default function InvestmentModal(props: InvestmentModalProps) {
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    let active = true;

    void loadRuntimeCryptoCatalog().then((assets) => {
      if (!active || assets.length === 0) return;
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
