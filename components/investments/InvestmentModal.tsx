"use client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";

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
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
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
      setPurchasedAt(new Date().toISOString().split("T")[0]);
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

    const { error: e } =
      isEditing ?
        await supabase
          .from("investments")
          .update(payload)
          .eq("id", investment!.id)
      : await supabase.from("investments").insert(payload);

    setLoading(false);
    // Replace the if/else at the bottom of handleSave:
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] border border-gray-800 text-white max-w-md p-0 gap-0">
        <DialogHeader className="p-5 border-b border-gray-800">
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "Edit Investment" : "Add Investment"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Asset Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bitcoin, Apple Stock"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
              style={{ colorScheme: "dark" }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity + Buy Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">
                Buy Price (PKR)
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
              />
            </div>
          </div>

          {/* Current Price */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Current Price (PKR)
            </label>
            <input
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="Leave blank to match buy price"
              className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors placeholder-gray-700"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">
              Purchase Date
            </label>
            <DatePicker
              value={purchasedAt}
              onChange={setPurchasedAt}
              placeholder="Select purchase date"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ?
              "Saving…"
            : isEditing ?
              "Update Investment"
            : "Add Investment"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
