import { describe, expect, it } from "vitest";
import {
  buildAssetBreakdownAnswer,
  isAssetBreakdownRequest,
} from "./asset-breakdown";

const money = (value: number) => `$${value.toFixed(2)}`;

describe("asset breakdown finance chat", () => {
  it("recognizes the screenshot follow-up from asset-list context", () => {
    expect(
      isAssetBreakdownRequest(
        "And what i the amounts of this.",
        "How many assets i have",
      ),
    ).toBe(true);
  });

  it("combines repeated purchases and returns exact per-asset amounts", () => {
    const result = buildAssetBreakdownAnswer(
      [
        {
          id: "1",
          name: "Bitcoin",
          symbol: "BTC",
          asset_id: "bitcoin",
          quantity: 0.1,
          purchase_price: 10000,
          current_price: 12000,
        },
        {
          id: "2",
          name: "Bitcoin",
          symbol: "BTC",
          asset_id: "bitcoin",
          quantity: 0.2,
          purchase_price: 11000,
          current_price: 12000,
        },
        {
          id: "3",
          name: "Ethereum",
          symbol: "ETH",
          asset_id: "ethereum",
          quantity: 1,
          purchase_price: 2000,
          current_price: 1800,
        },
      ],
      money,
    );

    expect(result.answer).toBe(
      "Bitcoin (BTC): quantity 0.3 BTC, invested $3200.00, current value $3600.00, unrealized profit $400.00; Ethereum (ETH): quantity 1 ETH, invested $2000.00, current value $1800.00, unrealized loss $200.00. Portfolio total: invested $5200.00, current value $5400.00, unrealized profit $200.00.",
    );
  });
});
