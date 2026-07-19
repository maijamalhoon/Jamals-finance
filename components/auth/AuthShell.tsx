import Link from "next/link";
import {
  ArrowLeft,
  CircleDollarSign,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import MathSymbolField from "@/components/landing/MathSymbolField";

export default function AuthShell({
  children,
  eyebrow,
  progress,
  title,
  description,
  icon: Icon = ShieldCheck,
  compact = false,
  minimal = false,
}: {
  children: ReactNode;
  eyebrow: string;
  progress?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
  minimal?: boolean;
}) {
  return (
    <main
      className="jf-auth-root"
      data-auth-root
      data-auth-minimal={minimal || undefined}
      data-auth-compact={compact || undefined}
    >
      <MathSymbolField variant="auth" />

      <header className="jf-auth-header">
        <Link
          href="/"
          aria-label="Jamal's Finance home"
          className="finance-focus jf-auth-brand"
        >
          <span className="jf-auth-brand-mark">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <span>Jamal&apos;s Finance</span>
        </Link>

        <Link
          href="/"
          aria-label="Return to Jamal's Finance home"
          className="finance-focus jf-auth-home-link"
        >
          <ArrowLeft aria-hidden="true" />
          <span>Home</span>
        </Link>
      </header>

      <div className={`jf-auth-layout ${compact ? "jf-auth-layout-compact" : ""}`}>
        <section className="jf-auth-card">
          <div className="jf-auth-card-head">
            <div className="jf-auth-card-meta">
              <div className="jf-auth-card-labels">
                <span className="auth-eyebrow">{eyebrow}</span>
                {progress ? <span className="auth-progress">{progress}</span> : null}
              </div>
              <span className="jf-auth-card-icon">
                <Icon aria-hidden="true" />
              </span>
            </div>

            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="jf-auth-card-body">{children}</div>
        </section>
      </div>

      {minimal ? (
        <footer className="jf-auth-footer">
          <span>Secure account access</span>
          <Link href="/#privacy" className="finance-focus">
            Privacy
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
