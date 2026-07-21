import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import CreateBusinessWorkspaceForm from "@/components/business/CreateBusinessWorkspaceForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Workspaces",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  base_currency: string;
  country_code: string | null;
  module_config: Record<string, boolean> | null;
};

type MembershipRow = {
  role: string;
  status: string;
  created_at: string;
  businesses: BusinessRow | BusinessRow[] | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function BusinessWorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/business");

  const membershipResult = await supabase
    .from("business_members")
    .select(
      "role, status, created_at, businesses(id, name, slug, business_type, base_currency, country_code, module_config)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (membershipResult.error) {
    console.error("Failed to load business workspaces", {
      code: membershipResult.error.code,
    });
  }

  const workspaces = ((membershipResult.data ?? []) as unknown as MembershipRow[])
    .map((membership) => ({
      membership,
      business: firstRelation(membership.businesses),
    }))
    .filter(
      (item): item is { membership: MembershipRow; business: BusinessRow } =>
        Boolean(item.business),
    );

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Personal finance
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Isolated business workspace
          </span>
        </div>

        <header className="mt-8 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
              <Building2 aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Jamal&apos;s Finance Business
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                Business workspaces
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
            Personal finance stays unchanged. Every company receives its own tenant, members,
            roles, currency, timezone, and module configuration.
          </p>
        </header>

        {membershipResult.error ? (
          <section className="mt-8 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger sm:px-5">
            Business workspaces could not be loaded right now. Your personal finance data is
            unaffected.
          </section>
        ) : null}

        {workspaces.length > 0 ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-text-primary sm:text-lg">
                  Your companies
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Choose a workspace to open its independent ERP foundation.
                </p>
              </div>
              <span className="text-sm font-black tabular-nums text-text-secondary">
                {workspaces.length}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaces.map(({ business, membership }) => {
                const enabledModules = Object.values(business.module_config ?? {}).filter(
                  Boolean,
                ).length;

                return (
                  <Link
                    key={business.id}
                    href={`/business/${business.slug}`}
                    className="finance-focus group rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                        <Building2 aria-hidden="true" className="size-5" />
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-text-tertiary transition-transform group-hover:translate-x-0.5"
                      />
                    </div>

                    <h3 className="mt-5 truncate text-lg font-black text-text-primary">
                      {business.name}
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      {formatLabel(business.business_type)} · {formatLabel(membership.role)}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                        <CircleDollarSign
                          aria-hidden="true"
                          className="mb-2 size-4 text-success"
                        />
                        <strong className="block text-text-primary">
                          {business.base_currency}
                        </strong>
                        <span className="text-xs text-text-secondary">Base currency</span>
                      </span>
                      <span className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                        <Layers3 aria-hidden="true" className="mb-2 size-4 text-primary" />
                        <strong className="block text-text-primary">{enabledModules}</strong>
                        <span className="text-xs text-text-secondary">Modules enabled</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-secondary px-5 py-5 text-sm text-text-secondary sm:px-6">
            No business workspace exists yet. Create the first company below without changing
            your personal tracker.
          </section>
        )}

        <div className="mt-8">
          <CreateBusinessWorkspaceForm />
        </div>
      </div>
    </main>
  );
}
