import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import MathSymbolField from "@/components/landing/MathSymbolField";
import { APP_NAME, brand } from "@/lib/brand";

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
          aria-label={`${APP_NAME} home`}
          className="finance-focus jf-auth-brand"
        >
          <span className="jf-auth-brand-mark">
            <Image
              src={brand.assets.logoMark}
              alt=""
              width={36}
              height={36}
              aria-hidden="true"
            />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <Link
          href="/"
          aria-label={`Return to ${APP_NAME} home`}
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
          <Link href="/privacy" className="finance-focus">
            Privacy
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
