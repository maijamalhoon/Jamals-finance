import { ArrowLeft, SearchX } from "@/components/icons/jalvoro/compat";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 py-10 text-text-primary">
      <div className="jf-node4-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />
      <section className="finance-surface relative w-full max-w-md p-6 text-center sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-[20px] border border-info/25 bg-info/10 text-info">
          <SearchX aria-hidden="true" size={24} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-info">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          This address is unavailable or has moved. Your finance records were not changed.
        </p>
        <Link href="/" className="primary-action finance-focus mt-6 inline-flex w-full items-center justify-center gap-2">
          <ArrowLeft aria-hidden="true" size={16} />
          Back to home
        </Link>
      </section>
    </main>
  );
}
