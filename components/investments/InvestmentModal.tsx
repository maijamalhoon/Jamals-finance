"use client";

import type { ComponentProps } from "react";

import InvestmentModalLocal from "./InvestmentModalLocal";

export type { ExistingInvestment } from "./InvestmentModalLocal";

type InvestmentModalProps = ComponentProps<typeof InvestmentModalLocal>;

export default function InvestmentModal(props: InvestmentModalProps) {
  return (
    <>
      <InvestmentModalLocal {...props} />
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
