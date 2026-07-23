import type { Metadata } from "next";
import LegalPageShell, {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Finance and Provider Disclosures",
  description:
    "Important disclosures about calculations, market prices, exchange rates, AI insights, and third-party providers used by Jamal's Finance.",
  alternates: { canonical: "/disclosures" },
};

const effectiveDate = "23 July 2026";

export default function DisclosuresPage() {
  return (
    <LegalPageShell
      eyebrow="Service disclosures"
      title="Know what each number means"
      summary="Jamal's Finance combines user-entered records, local calculations, reference rates, market providers, and optional AI output. These disclosures explain the limits of those sources."
      effectiveDate={effectiveDate}
    >
      <LegalSection id="not-advice" title="1. Information, not professional advice">
        <p>
          Jamal&apos;s Finance is a tracking and information tool. Nothing in the Service is financial, investment, tax, accounting, credit, insurance, legal, or other regulated professional advice. The Service does not recommend that you buy, sell, hold, borrow, lend, insure, or enter any transaction.
        </p>
      </LegalSection>

      <LegalSection id="records" title="2. User-entered records and calculations">
        <p>
          Dashboard totals and reports depend on the records you enter and the dates, categories, currencies, account links, quantities, and prices attached to them. Incorrect, missing, duplicated, delayed, or differently categorized records can change every downstream calculation.
        </p>
        <p>
          Some finance questions are answered by deterministic local calculations from authenticated records. These answers can be exact relative to the available stored records, but they are not independently audited statements.
        </p>
      </LegalSection>

      <LegalSection id="market-data" title="3. Market-price sources">
        <p>
          The current investment system can use several providers and fallback paths. Coverage and priority depend on configuration and provider availability.
        </p>
        <LegalList>
          <li>Binance browser streams can provide near-real-time crypto quotes for supported trading pairs.</li>
          <li>CoinGecko can provide delayed crypto reference prices and fallback coverage.</li>
          <li>Twelve Data can provide stock and forex quotes when an API key and suitable plan are configured.</li>
          <li>Finnhub can provide fallback quotes for supported U.S. stock symbols when configured.</li>
          <li>Yahoo Finance public chart responses can be used as delayed fallback stock data.</li>
          <li>Frankfurter can provide daily or reference foreign-exchange rates rather than executable tick prices.</li>
        </LegalList>
        <p>
          A displayed price can be delayed, stale, rounded, converted, temporarily cached, unavailable, or different from the price available through a broker, bank, exchange, or trading venue. Provider labels, market status, timestamps, and stale indicators should be reviewed before relying on a value.
        </p>
      </LegalSection>

      <LegalSection id="currency" title="4. Currency conversion">
        <p>
          The Service stores and converts monetary values using available exchange-rate snapshots and the selected display currency. A converted value is an estimate for presentation and comparison. It may not include spreads, fees, taxes, settlement differences, card rates, bank margins, or intraday movement.
        </p>
      </LegalSection>

      <LegalSection id="investments" title="5. Investment performance">
        <p>
          Investment value, gain, loss, and percentage calculations depend on quantity, purchase price, selected currency, exchange rate, withdrawals, linked transactions, and the latest usable market price. They do not represent audited performance, tax basis, realized proceeds, broker statements, or guaranteed liquidation value.
        </p>
        <p>
          Past or displayed performance does not predict future results. You can lose money when investing.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="6. AI-assisted insights">
        <p>
          AI insights can use Google Gemini when configured. The model receives the question and a summarized finance context that can include monthly totals, category names and totals, goal progress, investment totals, payable totals, estimated net position, and recent trends. It does not receive account passwords or authentication secrets from the application prompt.
        </p>
        <p>
          AI output is probabilistic. It can misunderstand context, produce an invalid response, omit relevant details, or suggest an unsuitable action. Local fallbacks and deterministic calculations reduce some risk but do not turn AI output into professional advice.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="7. Provider availability and licensing">
        <p>
          Free, public, demo, or unofficial provider endpoints may change without notice, impose request limits, block traffic, alter terms, or restrict commercial redistribution. Global commercial launch requires appropriate provider plans, licenses, attribution, and usage rights for the markets and traffic served.
        </p>
      </LegalSection>

      <LegalSection id="decisions" title="8. Important decisions">
        <p>
          Before making an important decision, compare the Service against original bank, broker, exchange, invoice, payroll, tax, or accounting records. Seek a qualified professional when the decision involves material risk, legal duties, tax treatment, regulated advice, or another person&apos;s money.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
