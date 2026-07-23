import { APP_NAME } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell, {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Support",
  description: `Account, privacy, data export, and service support for ${APP_NAME}.`,
  alternates: { canonical: "/support" },
};

const effectiveDate = "23 July 2026";
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

export default function SupportPage() {
  return (
    <LegalPageShell
      eyebrow="Support"
      title="Get help without exposing your data"
      summary="Use the safest available path for account, privacy, export, security, or service questions. Never publish passwords or finance records in a public report."
      effectiveDate={effectiveDate}
    >
      <LegalSection id="contact" title="1. Contact support">
        {supportEmail ? (
          <p>
            Email{" "}
            <a className="finance-focus font-semibold text-active" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
            . Include a short description of the problem, the affected page, and the approximate time it happened.
          </p>
        ) : (
          <p>
            The dedicated support inbox is not configured yet. It must be added before paid general availability. Until then, use the self-service options below and do not submit personal, authentication, or financial information through public repositories or issue trackers.
          </p>
        )}
      </LegalSection>

      <LegalSection id="self-service" title="2. Self-service options">
        <LegalList>
          <li>Sign in or recover access from the Account Access page.</li>
          <li>Change your password and revoke other sessions from Dashboard → Settings → Account Security.</li>
          <li>Download a complete finance backup from Dashboard → Settings → Data → Export Data.</li>
          <li>Import a previously downloaded {APP_NAME} backup from Dashboard → Settings → Data → Upload Data.</li>
          <li>Correct or remove individual records from the relevant finance page.</li>
        </LegalList>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link className="finance-focus rounded-full bg-active px-4 py-2.5 text-sm font-semibold text-text-inverse" href="/login">
            Account access
          </Link>
          <Link className="finance-focus rounded-full bg-surface-secondary px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-hover" href="/dashboard/settings">
            Open settings
          </Link>
        </div>
      </LegalSection>

      <LegalSection id="security" title="3. Report a security concern">
        <p>
          Stop using the affected session, change your password, revoke other sessions, and preserve non-sensitive evidence such as the time, route, browser, and error message. Do not test against another person&apos;s account or data.
        </p>
        <p>
          Never send passwords, recovery links, access tokens, database credentials, private keys, complete backup files, or screenshots containing unredacted finance records.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="4. Privacy and deletion requests">
        <p>
          Export important records before requesting deletion. A request may require identity verification. Production records will be removed or de-identified as applicable, while limited backup, fraud-prevention, security, or legally required records can remain until their normal retention period ends.
        </p>
        <p>
          Read the <Link className="finance-focus font-semibold text-active" href="/privacy">Privacy Notice</Link> for the current data-handling description.
        </p>
      </LegalSection>

      <LegalSection id="response" title="5. What to include in a support message">
        <LegalList>
          <li>The page or feature involved.</li>
          <li>What you expected and what happened instead.</li>
          <li>The approximate date and time, including your time zone.</li>
          <li>The browser, operating system, and device type.</li>
          <li>A redacted screenshot only when it does not reveal personal or finance data.</li>
        </LegalList>
      </LegalSection>
    </LegalPageShell>
  );
}
