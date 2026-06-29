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
    if (!name.trim() || !purchasePrice) {
      setError("Asset name and buy price are required.");
      return;
    }
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const buyPrice = parseFloat(purchasePrice);

    const payload = {
      user_id: user!.id,
      name: name.trim(),
      type,
      quantity: parseFloat(quantity) || 1,
      purchase_price: buyPrice,
      current_price: parseFloat(currentPrice) || buyPrice,
      purchased_at: purchasedAt,
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
            <label className="field-label">Asset Name</label>
            <input
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
              <label className="field-label">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Buy Price (PKR)</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Current Price (PKR)</label>
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Leave blank to match buy price"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Purchase Date</label>
            <DatePicker
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="Select purchase date"
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
