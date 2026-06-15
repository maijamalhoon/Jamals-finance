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
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm">Currency Converter</h3>
        <button
          onClick={fetchRate}
          disabled={loading}
          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={12}
            className={`text-gray-400 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* From */}
        <div className="flex-1 bg-gray-800/60 rounded-xl p-3">
          <p className="text-gray-500 text-[10px] mb-1">From</p>
          <p className="text-gray-400 text-xs mb-1.5">
            {fromUSD ? "USD" : "PKR"}
          </p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-white text-sm font-semibold outline-none w-full"
            min="0"
          />
        </div>

        {/* Swap */}
        <button
          onClick={() => setFromUSD((p) => !p)}
          className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700/50 flex items-center justify-center hover:bg-gray-700 transition-colors flex-shrink-0"
        >
          <ArrowLeftRight size={13} className="text-gray-400" />
        </button>

        {/* To */}
        <div className="flex-1 bg-gray-800/60 rounded-xl p-3">
          <p className="text-gray-500 text-[10px] mb-1">To</p>
          <p className="text-gray-400 text-xs mb-1.5">
            {fromUSD ? "PKR" : "USD"}
          </p>
          <p className="text-white text-sm font-semibold">{converted}</p>
        </div>
      </div>

      {/* Rate + Status */}
      <div className="flex items-center gap-2 mt-3">
        {loading ?
          <p className="text-gray-600 text-xs">Fetching rate…</p>
        : <>
            <p className="text-gray-500 text-xs">
              1 USD = {rate?.toFixed(2)} PKR
            </p>
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? "bg-green-400" : "bg-yellow-400"}`}
              />
              <span
                className={`text-[10px] ${live ? "text-green-400" : "text-yellow-400"}`}
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
