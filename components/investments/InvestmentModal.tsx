"use client";

import { useEffect, useState, type ComponentProps } from "react";

import { loadSearchableCryptoCatalog } from "@/lib/market/crypto-search-catalog-client";

import InvestmentModalLocal from "./InvestmentModalLocal";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalLocal>;

export default function InvestmentModal(props: InvestmentModalProps) {
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    let active = true;

    void loadSearchableCryptoCatalog().then((assets) => {
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

        #investment-crypto-results [role="option"] {
          grid-template-columns: auto minmax(0, 1fr);
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
