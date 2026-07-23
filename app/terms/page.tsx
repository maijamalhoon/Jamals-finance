import type { Metadata } from "next";
import LegalPageShell, {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPageShell";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing access to and use of ${APP_NAME}.`,
  alternates: { canonical: "/terms" },
};

const effectiveDate = "23 July 2026";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms of service"
      title={`Rules for using ${APP_NAME}`}
      summary="These Terms describe the current agreement for accessing and using the platform. Please read them before creating an account or relying on the Service."
      effectiveDate={effectiveDate}
    >
      <LegalSection id="agreement" title="1. Agreement">
        <p>
          By creating an account, signing in, or using {APP_NAME}, you agree to these Terms and the Privacy Notice. If you do not agree, do not use the Service.
        </p>
        <p>
          You must be legally able to enter this agreement in your location. The Service is not intended for people who are below the applicable age of digital or contractual consent.
        </p>
      </LegalSection>

      <LegalSection id="service" title="2. What the Service provides">
        <p>
          {APP_NAME} provides connected tools for personal records, business workspaces, accounting, sales, purchases, inventory, customer relationships, reports, backups, and related operational information. Some features can use third-party market data or AI providers.
        </p>
        <p>
          The Service is a record-keeping and information tool. It is not a bank, payment processor, broker, investment adviser, accountant, tax adviser, insurer, lender, or fiduciary. Unless a feature explicitly states otherwise, it does not hold or transfer your money or financial assets.
        </p>
      </LegalSection>

      <LegalSection id="account" title="3. Your account responsibilities">
        <LegalList>
          <li>Provide accurate account information and keep it updated.</li>
          <li>Use a strong, unique password and protect access to your email and devices.</li>
          <li>Do not share sessions, verification links, recovery codes, or credentials.</li>
          <li>Notify support promptly if you suspect unauthorized use.</li>
          <li>Keep independent copies of important information by using available export features.</li>
        </LegalList>
        <p>
          You are responsible for activity performed through your account unless applicable law provides otherwise.
        </p>
      </LegalSection>

      <LegalSection id="records" title="4. Your records">
        <p>
          You retain responsibility for the records, labels, notes, files, and other content you enter. You grant the Service the limited permission needed to store, process, calculate, display, back up, export, and transmit that information solely to operate requested features and protect the Service.
        </p>
        <p>
          Do not enter information you are not authorized to use. Do not place passwords, payment-card security codes, private keys, government identity documents, or other unnecessary secrets in notes or AI questions.
        </p>
      </LegalSection>

      <LegalSection id="accuracy" title="5. Calculations, market data, and AI output">
        <LegalList>
          <li>Calculations depend on the records, dates, currencies, exchange rates, and assumptions available to the Service.</li>
          <li>Market prices can be delayed, stale, incomplete, unavailable, or different from executable prices.</li>
          <li>AI output can be incomplete, incorrect, or unsuitable for your circumstances.</li>
          <li>Exchange-rate conversions and estimated values are informational unless clearly identified otherwise.</li>
        </LegalList>
        <p>
          Verify important figures independently before making financial, investment, tax, legal, accounting, employment, credit, or business decisions. The Service does not guarantee profit, savings, tax treatment, credit outcomes, or investment performance.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="6. Acceptable use">
        <p>You must not:</p>
        <LegalList>
          <li>Break the law, violate another person&apos;s rights, or use the Service for fraud, money laundering, evasion, harassment, or deception.</li>
          <li>Attempt to access another user&apos;s account, records, storage, business workspace, or private route.</li>
          <li>Probe, scan, exploit, reverse engineer, overload, scrape, or disrupt the Service except through an authorized security-testing program.</li>
          <li>Bypass authentication, rate limits, technical restrictions, provider limits, or payment controls.</li>
          <li>Upload malicious code or use automation that materially degrades the Service.</li>
          <li>Misrepresent generated insights or market data as guaranteed, regulated, or professionally certified advice.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="availability" title="7. Availability and changes">
        <p>
          Features can change, be limited, or become unavailable because of maintenance, security concerns, provider outages, legal requirements, capacity, or product decisions. We will try to preserve user records and communicate material changes, but uninterrupted or error-free operation is not guaranteed.
        </p>
        <p>
          Third-party providers can change their services, pricing, coverage, retention, rate limits, or terms. {APP_NAME} is not responsible for a provider&apos;s independent acts or omissions, but will use reasonable efforts to provide clear fallback and unavailable states.
        </p>
      </LegalSection>

      <LegalSection id="suspension" title="8. Suspension and termination">
        <p>
          Access may be limited or suspended to protect users, investigate suspected abuse, comply with law, prevent damage, or address a material breach of these Terms. Where reasonably possible, the operator will give notice and an opportunity to resolve the issue.
        </p>
        <p>
          You may stop using the Service at any time. Export important records before requesting account deletion. Some limited records can remain temporarily in backups, security evidence, or legally required records as explained in the Privacy Notice.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="9. Service ownership">
        <p>
          The Service software, interface, branding, documentation, and original content are owned by the operator or licensed providers. These Terms give you a limited, personal, revocable, non-exclusive right to use the Service as offered; they do not transfer ownership of the Service or third-party materials.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="10. Disclaimers">
        <p>
          To the maximum extent permitted by applicable law, the Service is provided “as is” and “as available”. We do not make warranties that every calculation, provider response, insight, forecast, conversion, export, import, or availability state will be complete, current, or suitable for a particular purpose.
        </p>
        <p>
          Nothing in these Terms excludes rights or warranties that cannot legally be excluded in your location.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="11. Liability">
        <p>
          To the maximum extent permitted by applicable law, the operator is not liable for indirect, incidental, special, consequential, exemplary, or lost-profit damages arising from use of the Service, reliance on informational output, provider failures, or loss caused by credentials or devices outside the operator&apos;s reasonable control.
        </p>
        <p>
          Any limitation applies only to the extent lawful and does not limit liability that cannot be excluded, including liability arising from fraud, willful misconduct, or other non-excludable obligations.
        </p>
      </LegalSection>

      <LegalSection id="law" title="12. Governing rules and disputes">
        <p>
          These Terms do not override mandatory consumer or privacy rights in your location. Before starting formal proceedings, both sides should try in good faith to resolve a dispute through the published support channel, except where urgent legal relief or a regulator process is available.
        </p>
        <p>
          Jurisdiction-specific governing-law, dispute-resolution, tax, and commercial terms require review for the operator&apos;s final legal entity and launch markets. Those details will be updated before paid general availability.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact and changes">
        {supportEmail ? (
          <p>
            Questions about these Terms can be sent to{" "}
            <a className="finance-focus font-semibold text-active" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        ) : (
          <p>
            A dedicated support inbox is being configured before paid general availability. Do not send personal or financial records through public repositories or issue trackers.
          </p>
        )}
        <p>
          These Terms may be updated when the Service, providers, legal entity, pricing, or applicable requirements change. Material changes will be communicated through an appropriate channel where required.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
