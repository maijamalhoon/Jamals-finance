"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Target,
  Settings,
} from "lucide-react";
import TransactionModal from "@/components/dashboard/TransactionModal";

const NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden h-16 bg-[#0F1117] border-t border-gray-800/50 flex items-center justify-around px-2 flex-shrink-0">
        {NAV.slice(0, 2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              pathname === href ? "text-indigo-400" : "text-gray-600"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}

        {/* Center + button */}
        <button
          onClick={() => setOpen(true)}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/25 transition-colors"
        >
          <Plus size={22} className="text-white" />
        </button>

        {NAV.slice(2).map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              pathname === href ? "text-indigo-400" : "text-gray-600"
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>

      <TransactionModal
        open={open}
        defaultType="income"
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
