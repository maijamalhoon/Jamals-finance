import { describe, expect, it } from "vitest";
import {
  buildDeterministicFinanceAnswer,
  parseDeterministicFinanceQuestion,
} from "./deterministic-finance-chat";

const now = { year: 2026, month: 7, day: 20 };
const money = (value: number) => `$${value.toFixed(2)}`;

describe("deterministic finance chat", () => {
  it("routes asset earnings to investment profit instead of income", () => {
    expect(
      parseDeterministicFinanceQuestion(
        "How much i earn from assets all time",
        now,
      ),
    ).toMatchObject({
      kind: "asset-profit",
      range: { allTime: true },
    });
  });

  it("recognizes asset count and names questions", () => {
    const intent = parseDeterministicFinanceQuestion(
      "How many assets i have and there names",
      now,
    );

    expect(intent).toEqual({ kind: "assets" });
    expect(
      buildDeterministicFinanceAnswer({
        intent: intent!,
        question: "How many assets i have and there names",
        data: {
          investments: [
            { id: "1", name: "Bitcoin", symbol: "BTC" },
            { id: "2", name: "Bitcoin", symbol: "BTC" },
            { id: "3", name: "Ethereum", symbol: "ETH" },
          ],
        },
        money,
      }).answer,
    ).toBe(
      "You have 2 distinct recorded assets: Bitcoin (BTC), Ethereum (ETH). These are stored across 3 investment purchase records.",
    );
  });

  it("filters all-time spending by category and subtracts refunds", () => {
    const question = "How much i spend on food in all time";
    const intent = parseDeterministicFinanceQuestion(question, now);

    expect(intent).toMatchObject({
      kind: "spending",
      range: { allTime: true },
      categoryRequested: true,
    });
    expect(
      buildDeterministicFinanceAnswer({
        intent: intent!,
        question,
        data: {
          categoryNames: ["Food", "Transport"],
          transactions: [
            {
              type: "expense",
              amount: 100,
              date: "2025-01-01",
              categories: { name: "Food" },
            },
            {
              type: "refund",
              amount: 20,
              date: "2025-01-02",
              categories: { name: "Food" },
            },
            {
              type: "expense",
              amount: 200,
              date: "2026-07-01",
              categories: { name: "Transport" },
            },
          ],
        },
        money,
      }).answer,
    ).toBe(
      "Your net spending on Food during all time was $80.00: $100.00 in expenses minus $20.00 in refunds, across 1 expense transaction.",
    );
  });

  it("keeps yesterday income on the requested single date", () => {
    expect(
      parseDeterministicFinanceQuestion("How much i earn yesterday", now),
    ).toMatchObject({
      kind: "income",
      range: {
        start: "2026-07-19",
        end: "2026-07-19",
        allTime: false,
      },
    });
  });
});
