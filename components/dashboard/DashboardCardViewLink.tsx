import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardCardViewLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="finance-focus group grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-primary p-0 text-text-secondary shadow-sm transition-[background-color,border-color,color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-hover hover:text-primary hover:shadow-md active:translate-y-0 active:scale-[0.97] sm:size-10"
    >
      <ArrowRight
        size={16}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
