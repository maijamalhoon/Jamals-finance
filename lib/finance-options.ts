import {
  Banknote,
  Briefcase,
  Car,
  CircleDollarSign,
  CreditCard,
  Home,
  Landmark,
  LucideIcon,
  ReceiptText,
  Smartphone,
  Wallet,
} from "lucide-react";

export const INCOME_SOURCE_SUGGESTIONS = [
  "inDrive rides",
  "Toyota commission",
  "Website project payments",
  "Salary",
  "Bonus",
  "Freelance income",
  "Other income",
];

export const ACCOUNT_TYPES: {
  value: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  { value: "cash", label: "Cash", icon: Wallet, tone: "text-green-300 bg-green-500/15" },
  { value: "bank", label: "Bank Account", icon: Landmark, tone: "text-sky-300 bg-sky-500/15" },
  { value: "jazzcash", label: "JazzCash", icon: Smartphone, tone: "text-orange-300 bg-orange-500/15" },
  { value: "easypaisa", label: "Easypaisa", icon: Smartphone, tone: "text-lime-300 bg-lime-500/15" },
  { value: "sadapay", label: "Sadapay", icon: CreditCard, tone: "text-pink-300 bg-pink-500/15" },
  { value: "nayapay", label: "NayaPay", icon: CreditCard, tone: "text-cyan-300 bg-cyan-500/15" },
  { value: "wallet", label: "Other Wallet", icon: Banknote, tone: "text-violet-300 bg-violet-500/15" },
  { value: "freelance", label: "Freelance", icon: Briefcase, tone: "text-indigo-300 bg-indigo-500/15" },
  { value: "investment", label: "Investment", icon: CircleDollarSign, tone: "text-amber-300 bg-amber-500/15" },
  { value: "other", label: "Other", icon: Home, tone: "text-slate-300 bg-slate-500/15" },
];

export const EXPENSE_CATEGORY_HINTS = [
  "Grocery",
  "Household items",
  "Fuel",
  "Bills",
  "Rent",
  "Food",
  "Shopping",
  "Family",
  "Car maintenance",
  "Mobile load",
  "Internet",
  "Medical",
  "Debt repayment",
  "Other expenses",
];

export const PAYABLE_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-400/12 text-amber-200 ring-amber-300/15",
  },
  partial: {
    label: "Partially paid",
    className: "bg-sky-400/12 text-sky-200 ring-sky-300/15",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-400/12 text-emerald-200 ring-emerald-300/15",
  },
  overdue: {
    label: "Overdue",
    className: "bg-rose-400/12 text-rose-200 ring-rose-300/15",
  },
};

export function formatPKR(value: number | string | null | undefined) {
  return `PKR ${Number(value ?? 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

export function getPayableStatus(payable: {
  status: string;
  remaining_amount: number | string;
  due_date: string | null;
}) {
  const remaining = Number(payable.remaining_amount);
  if (remaining <= 0) return "completed";
  if (payable.due_date && payable.due_date < new Date().toISOString().split("T")[0]) {
    return "overdue";
  }
  return payable.status === "completed" ? "partial" : payable.status;
}

export function getAccountType(value: string) {
  return ACCOUNT_TYPES.find((type) => type.value === value) ?? ACCOUNT_TYPES[0];
}

export const PAYABLE_QUICK_REASONS = [
  { label: "Borrowed cash", icon: Banknote },
  { label: "Borrowed item", icon: ReceiptText },
  { label: "Car / fuel help", icon: Car },
  { label: "Family payment", icon: Home },
];
