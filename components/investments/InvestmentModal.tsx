"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
import { getAppDateKey } from "@/lib/dates";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";

const TYPES = [
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
  { value: "savings", label: "Savings" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export interface ExistingInvestment {
  id: string;
  name: string;
  type: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchased_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investment?: ExistingInvestment;
}

export default function InvestmentModal({
  open,
  onClose,
  onSuccess,
  investment,
}: Props) {
  const supabase = createClient();
  const isEditing = !!investment;

  const [name, setName] = useState("");
  const [type, setType] = useState("crypto");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(getAppDateKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (investment) {
      setName(investment.name);
      setType(investment.type);
      setQuantity(String(investment.quantity));
      setPurchasePrice(String(investment.purchase_price));
      setCurrentPrice(String(investment.current_price));
      setPurchasedAt(investment.purchased_at);
    } else {
      setName("");
      setType("crypto");
      setQuantity("");
      setPurchasePrice("");
      setCurrentPrice("");
      setPurchasedAt(getAppDateKey());
    }
    setError("");
  }, [open, investment]);

  async function handleSave() {
    const assetName = name.trim();
    const parsedQuantity = parseNumber(quantity);
    const parsedPurchasePrice = parseNumber(purchasePrice);
    const parsedCurrentPrice = currentPrice ? parseNumber(currentPrice) : null;
    const purchaseDate = purchasedAt.trim();

    if (!assetName) {
      setError("Enter an asset name.");
      return;
    }

    if (parsedQuantity === null || parsedQuantity <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }

    if (parsedPurchasePrice === null || parsedPurchasePrice <= 0) {
      setError("Enter a buy price greater than 0.");
      return;
    }

    if (parsedCurrentPrice !== null && parsedCurrentPrice < 0) {
      setError("Current price cannot be negative.");
      return;
    }

    if (!isValidDateKey(purchaseDate)) {
      setError("Enter a valid purchase date.");
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Please sign in again before saving this investment.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: assetName,
      type,
      quantity: parsedQuantity,
      purchase_price: parsedPurchasePrice,
      current_price: parsedCurrentPrice ?? parsedPurchasePrice,
      purchased_at: purchaseDate,
    };

    const { error: e } = isEditing
      ? await supabase
          .from("investments")
          .update(payload)
          .eq("id", investment!.id)
      : await supabase.from("investments").insert(payload);

    setLoading(false);

    if (e) {
      setError("Failed to save. Try again.");
      toast.error("Failed to save investment");
      return;
    }
    toast.success(isEditing ? "Investment updated!" : "Investment added!");
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${financeModalContentClass} sm:max-w-lg`}>
        <FinanceModalHeader
          title={isEditing ? "Edit Investment" : "Add Investment"}
          description="Enter asset details, pricing, and purchase date."
          icon={BriefcaseBusiness}
          tone="investment"
        />

        <FinanceModalBody>
          <div>
            <label className="field-label" htmlFor="investment-name">
              Asset Name
            </label>
            <input
              id="investment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bitcoin, Apple Stock"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setType(item.value)}
                  aria-pressed={type === item.value}
                  className={`finance-focus min-h-11 rounded-[16px] border px-3 py-2 text-sm font-semibold transition-colors ${
                    type === item.value
                      ? "border-border bg-card text-text-primary shadow-theme"
                      : "border-border bg-surface-secondary text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="investment-quantity">
                Quantity
              </label>
              <input
                id="investment-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="investment-purchase-price">
                Buy Price (PKR)
              </label>
              <input
                id="investment-purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="investment-current-price">
              Current Price (PKR)
            </label>
            <input
              id="investment-current-price"
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Leave blank to match buy price"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="investment-purchased-at">
              Purchase Date
            </label>
            <DatePicker
              id="investment-purchased-at"
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="DD/MM/YYYY"
              ariaLabel="Investment purchase date"
            />
          </div>

          {error && <p className={financeErrorClass}>{error}</p>}
        </FinanceModalBody>

        <FinanceModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={financeCancelButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="primary-action py-3"
          >
            {loading ? "Saving..." : isEditing ? "Update Investment" : "Add Investment"}
          </button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
