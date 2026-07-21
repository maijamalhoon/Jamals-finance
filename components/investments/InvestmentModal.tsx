"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

import { loadSearchableCryptoCatalog } from "@/lib/market/crypto-search-catalog-client";

import InvestmentModalLocal from "./InvestmentModalLocal";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalLocal>;

export default function InvestmentModal(props: InvestmentModalProps) {
  const [catalogVersion, setCatalogVersion] = useState(0);
  const openRef = useRef(props.open);
  const pendingCatalogRefreshRef = useRef(false);

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
      <InvestmentModalLocal key={catalogVersion} {...props} />
      <style jsx global>{`
        label[for="investment-purchase-price"]
          + select[aria-label="Currency"],
        label[for="investment-current-price"]
          + select[aria-label="Currency"] {
          display: none;
        }

        #investment-crypto-results [role="option"] > span:last-child,
        #investment-current-price + div {
          display: none;
        }

        #investment-current-price::placeholder {
          color: transparent;
        }

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
