"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

const RATE = 281.2;

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [fromUSD, setFromUSD] = useState(true);

  const numAmount = parseFloat(amount) || 0;
  const converted =
    fromUSD ?
      (numAmount * RATE).toLocaleString("en-PK", { maximumFractionDigits: 2 })
    : (numAmount / RATE).toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-4">
        Currency Converter
      </h3>

      <div className="flex items-center gap-2">
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

        <button
          onClick={() => setFromUSD((p) => !p)}
          className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700/50 flex items-center justify-center flex-shrink-0 hover:bg-gray-700 transition-colors"
        >
          <ArrowLeftRight size={13} className="text-gray-400" />
        </button>

        <div className="flex-1 bg-gray-800/60 rounded-xl p-3">
          <p className="text-gray-500 text-[10px] mb-1">To</p>
          <p className="text-gray-400 text-xs mb-1.5">
            {fromUSD ? "PKR" : "USD"}
          </p>
          <p className="text-white text-sm font-semibold">{converted}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <p className="text-gray-500 text-xs">1 USD = {RATE} PKR</p>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-green-400 text-[10px]">Live</span>
        </span>
      </div>
    </div>
  );
}
