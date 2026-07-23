import type { Metadata } from "next";
import LegalPageShell, {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "How Jamal's Finance collects, uses, stores, and shares account and finance information.",
  alternates: { canonical: "/privacy" },
};

const effectiveDate = "23 July 2026";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy notice"
      title="How your information is handled"
      summary="Jamal's Finance is a personal-finance workspace. This notice explains what information the service uses, why it is needed, and the choices available to you."
      effectiveDate={effectiveDate}
    >
      <LegalSection id="operator" title="1. Service operator and contact">
        <p>
          Jamal&apos;s Finance is operated by Jamal Yaqoob. References to “we”, “us”, or “the Service” in this notice mean Jamal&apos;s Finance and its operator.
        </p>
        {supportEmail ? (
          <p>
            Privacy and account requests can be sent to{" "}
            <a className="finance-focus font-semibold text-active" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            .
          </p>
        ) : (
          <p>
            A dedicated support inbox is being configured before general commercial availability. Until it is published, use the in-product export tools and do not post personal or financial information in public repositories or issue trackers.
          </p>
        )}
      </LegalSection>

      <LegalSection id="information" title="2. Information the Service handles">
        <LegalList>
          <li>Account information such as email address, display name, authentication state, and optional profile image.</li>
          <li>Financial records you choose to enter, including accounts, balances, income, expenses, transfers, categories, goals, payables, investments, dates, and notes.</li>
          <li>Business-workspace records when business features are used, including workspace membership and records entered into those modules.</li>
          <li>Preferences stored for the experience, such as currency, date format, theme, animation, notification, and setup choices.</li>
          <li>Security and operational information such as request metadata, authentication events, rate-limit counters, error details, and device or browser information needed to operate and protect the Service.</li>
          <li>Privacy-minimised product telemetry when enabled, such as a random subject identifier, temporary session identifier, route template, approved feature event, performance timing, approximate country, region and city derived from the network request, and broad device, operating-system and browser family.</li>
          <li>Questions submitted to AI insights and summarized financial metrics generated to answer those questions.</li>
        </LegalList>
        <p>
          Custom product telemetry is designed not to store raw IP addresses, exact coordinates, exact device models, URL query strings, typed content, screenshots, session recordings, account balances, transaction values, notes, passwords, or authentication tokens.
        </p>
        <p>
          The Service does not ask for online-banking passwords, payment-card security codes, or brokerage login credentials. Do not place those secrets in notes, chat questions, support messages, or uploaded files.
        </p>
      </LegalSection>

      <LegalSection id="purposes" title="3. Why information is used">
        <LegalList>
          <li>To create and secure your account and keep protected routes private.</li>
          <li>To save, calculate, display, search, export, import, and restore the finance records you request.</li>
          <li>To produce dashboards, reports, cash-flow views, goal progress, payable status, investment calculations, and other requested features.</li>
          <li>To measure page and operation performance, find slow or failed experiences, understand broad feature usage, and improve reliability without inspecting financial content.</li>
          <li>To prevent abuse, investigate failures, enforce request limits, and maintain service reliability.</li>
          <li>To provide AI-assisted insights when you choose to use that feature.</li>
          <li>To meet legal obligations, respond to valid legal process, protect users, and enforce the Terms.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="providers" title="4. Service providers and data sharing">
        <p>
          Information is shared only as needed to operate requested features, secure the Service, comply with law, or protect users. The current technical providers include:
        </p>
        <LegalList>
          <li>Supabase for authentication, database, storage, and related backend services, including the private storage of approved telemetry events when that system is enabled.</li>
          <li>Vercel for hosting, delivery, serverless execution, operational logs, and approximate country, region, and city headers derived from an incoming network request. The custom telemetry database does not retain the raw IP address.</li>
          <li>Sentry for error and performance monitoring when production monitoring is configured. The application is configured not to send default personal information, to disable session replay, and to remove sensitive request details.</li>
          <li>Google authentication when Google sign-in is enabled and selected.</li>
          <li>Google Gemini when an AI insight requires an external model. The Service sends the user&apos;s question and a summarized finance context that can include totals, category names, goal progress, investment totals, payable totals, and recent trends. Passwords and authentication secrets are not included.</li>
          <li>Market-data providers listed on the Disclosures page. Requests normally contain asset identifiers, symbols, or currency pairs rather than your identity or complete finance ledger.</li>
        </LegalList>
        <p>
          The current Service is not designed to sell personal or financial records or to use them for third-party advertising. We may disclose information during a lawful business transfer only with appropriate safeguards and notice where required.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="5. AI insights">
        <p>
          Many finance questions are answered locally through deterministic calculations. When a question cannot be answered by the local calculator and Gemini is configured, the Service may send a summarized finance context and the question to Google Gemini. AI output can be incomplete or wrong and must not be treated as financial, tax, legal, accounting, or investment advice.
        </p>
        <p>
          You can avoid external AI processing by not using AI insights. Core tracking, reports, exports, and local finance calculations remain separate from the external model feature.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. Retention and deletion">
        <p>
          Account and finance records are generally retained while the account is active so the Service can provide the requested workspace. Operational logs and security records may be retained for shorter periods set by provider configuration, incident needs, or legal requirements.
        </p>
        <p>
          Detailed custom product and performance telemetry is designed for a 30-day retention period. Longer-lived reporting should use aggregated statistics that no longer contain a session-level event trail. A private account-to-random-subject mapping is removed when the associated account is deleted.
        </p>
        <p>
          When an account-deletion request is completed, active production records are removed or de-identified as applicable. Limited copies can remain temporarily in backups, security evidence, or records required by law until their normal retention cycle ends.
        </p>
      </LegalSection>

      <LegalSection id="choices" title="7. Your choices and rights">
        <LegalList>
          <li>Access and correct finance records directly in the Service.</li>
          <li>Download a complete finance backup from Dashboard → Settings → Data.</li>
          <li>Delete individual records using the available product controls.</li>
          <li>Request account deletion or a privacy review through the published support contact.</li>
          <li>Stop external AI processing by not using AI insights.</li>
          <li>Sign out locally or revoke other sessions through account security controls.</li>
        </LegalList>
        <p>
          Where applicable law requires consent for optional analytics, the Service will request that choice before enabling the related collection. Additional rights may apply based on where you live, including rights to access, correct, delete, restrict, object, receive a portable copy, or complain to a supervisory authority. Identity verification may be required before fulfilling a request.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          The Service uses authenticated sessions, row-level database controls, owner-scoped storage, encrypted transport, request validation, rate limits, private caching rules, and monitoring safeguards. No online service can promise absolute security. Use a unique password, protect your email account, keep devices updated, and report suspected unauthorized access promptly.
        </p>
      </LegalSection>

      <LegalSection id="international" title="9. International processing">
        <p>
          The Service and its providers can process information in countries other than the one where you live. Where required, the operator will use appropriate contractual, technical, and organizational safeguards for international transfers.
        </p>
      </LegalSection>

      <LegalSection id="children" title="10. Children">
        <p>
          The Service is intended for adults and people who have reached the age required to enter a binding agreement in their location. It is not knowingly directed to children. Contact support if you believe a child provided personal information without appropriate authorization.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this notice">
        <p>
          This notice will be revised when the Service changes providers, processing purposes, retention practices, or legal obligations. Material changes will be communicated through the Service or another appropriate channel before they take effect where required.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
