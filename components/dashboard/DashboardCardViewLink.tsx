import Link from "next/link";
import { ArrowRight } from "@/components/icons/jalvoro/compat";

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
      className="dashboard-card-view-link finance-focus group grid size-9 shrink-0 place-items-center rounded-xl border-0 bg-transparent p-0 text-text-secondary shadow-none transition-[background-color,color,transform] hover:bg-hover hover:text-primary active:scale-[0.94] sm:size-10"
    >
      <ArrowRight
        size={16}
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dashboard-card-view-link-icon"
        aria-hidden="true"
      />
    </Link>
  );
}
