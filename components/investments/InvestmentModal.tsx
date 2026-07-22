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
