"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";

export default function CurrencyConverter() {
  const [rate, setRate] = useState<number | null>(null);
  const [amount, setAmount] = useState("1");
  const [fromUSD, setFromUSD] = useState(true);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  async function fetchRate() {
    setLoading(true);
    try {
      const res = await fetch("/api/exchange-rate");
      const data = await res.json();
      setRate(data.rate);
      setLive(data.live);
    } catch {
      setRate(281.2);
      setLive(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRate();
  }, []);

  const num = parseFloat(amount) || 0;
  const converted =
    rate ?
      fromUSD ?
        (num * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : (num / rate).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "...";

  return (
    <div className="finance-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-950 font-semibold text-sm">Currency Converter</h3>
        <button
          onClick={fetchRate}
          disabled={loading}
          className="finance-control w-7 h-7 flex items-center justify-center disabled:opacity-50"
          aria-label="Refresh exchange rate"
        >
          <RefreshCw
            size={12}
            className={`text-slate-600 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 finance-panel-soft p-3">
          <p className="text-slate-500 text-[10px] mb-1">From</p>
          <p className="text-slate-400 text-xs mb-1.5">
            {fromUSD ? "USD" : "PKR"}
          </p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-slate-950 text-sm font-semibold outline-none w-full"
            min="0"
          />
        </div>

        <button
          onClick={() => setFromUSD((p) => !p)}
          className="finance-control w-8 h-8 flex items-center justify-center flex-shrink-0"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight size={13} className="text-slate-600" />
        </button>

        <div className="flex-1 finance-panel-soft p-3">
          <p className="text-slate-500 text-[10px] mb-1">To</p>
          <p className="text-slate-400 text-xs mb-1.5">
            {fromUSD ? "PKR" : "USD"}
          </p>
          <p className="text-slate-950 text-sm font-semibold">{converted}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {loading ?
          <p className="text-slate-500 text-xs">Fetching rate...</p>
        : <>
            <p className="text-slate-500 text-xs">
              1 USD = {rate?.toFixed(2)} PKR
            </p>
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span
                className={`text-[10px] ${live ? "text-emerald-600" : "text-amber-600"}`}
              >
                {live ? "Live" : "Fallback"}
              </span>
            </span>
          </>
        }
      </div>
    </div>
  );
}
