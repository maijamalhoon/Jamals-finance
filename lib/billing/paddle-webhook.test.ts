import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  normalizePaddleEvent,
  sha256Hex,
  verifyPaddleSignature,
} from "./paddle-webhook";

const EVENT_ID = "evt_01h00000000000000000000000";
const CUSTOMER_ID = "ctm_01h00000000000000000000000";
const SUBSCRIPTION_ID = "sub_01h00000000000000000000000";
const TRANSACTION_ID = "txn_01h00000000000000000000000";
const PRICE_ID = "pri_01h00000000000000000000000";
const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

describe("Paddle webhook contracts", () => {
  it("verifies the exact raw body and rejects transformed or expired payloads", async () => {
    const rawBody = JSON.stringify({ hello: "world" });
    const secret = "pdl_ntfset_test_secret";
    const timestamp = 1_750_000_000;
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}:${rawBody}`)
      .digest("hex");
    const header = `ts=${timestamp};h1=${signature}`;

    await expect(
      verifyPaddleSignature({
        rawBody,
        signatureHeader: header,
        secret,
        nowSeconds: timestamp,
      }),
    ).resolves.toBe(true);

    await expect(
      verifyPaddleSignature({
        rawBody: `${rawBody} `,
        signatureHeader: header,
        secret,
        nowSeconds: timestamp,
      }),
    ).resolves.toBe(false);

    await expect(
      verifyPaddleSignature({
        rawBody,
        signatureHeader: header,
        secret,
        nowSeconds: timestamp + 301,
      }),
    ).resolves.toBe(false);
  });

  it("normalizes subscription state without retaining the raw payload", () => {
    const normalized = normalizePaddleEvent({
      event_id: EVENT_ID,
      event_type: "subscription.updated",
      occurred_at: "2026-07-24T20:00:00.000Z",
      data: {
        id: SUBSCRIPTION_ID,
        customer_id: CUSTOMER_ID,
        status: "active",
        transaction_id: TRANSACTION_ID,
        custom_data: { jalvoro_billing_account_id: ACCOUNT_ID },
        current_billing_period: {
          starts_at: "2026-07-24T20:00:00.000Z",
          ends_at: "2026-08-24T20:00:00.000Z",
        },
        scheduled_change: {
          action: "cancel",
          effective_at: "2026-08-24T20:00:00.000Z",
        },
        items: [{ price: { id: PRICE_ID } }],
      },
    });

    expect(normalized).toEqual({
      eventId: EVENT_ID,
      eventType: "subscription.updated",
      occurredAt: "2026-07-24T20:00:00.000Z",
      accountId: ACCOUNT_ID,
      providerCustomerId: CUSTOMER_ID,
      providerSubscriptionId: SUBSCRIPTION_ID,
      providerTransactionId: TRANSACTION_ID,
      providerPriceId: PRICE_ID,
      status: "active",
      periodStart: "2026-07-24T20:00:00.000Z",
      periodEnd: "2026-08-24T20:00:00.000Z",
      cancelAtPeriodEnd: true,
      billingCountry: null,
    });
  });

  it("maps failed renewal transactions to past due", () => {
    const normalized = normalizePaddleEvent({
      event_id: EVENT_ID,
      event_type: "transaction.payment_failed",
      occurred_at: "2026-07-24T20:00:00.000Z",
      data: {
        id: TRANSACTION_ID,
        subscription_id: SUBSCRIPTION_ID,
        customer_id: CUSTOMER_ID,
        status: "past_due",
        custom_data: { jalvoro_billing_account_id: ACCOUNT_ID },
        items: [{ price: { id: PRICE_ID } }],
      },
    });

    expect(normalized?.status).toBe("past_due");
    expect(normalized?.providerTransactionId).toBe(TRANSACTION_ID);
    expect(normalized?.providerSubscriptionId).toBe(SUBSCRIPTION_ID);
  });

  it("produces a stable lowercase payload hash", async () => {
    await expect(sha256Hex("JALVORO")).resolves.toMatch(/^[a-f0-9]{64}$/);
    await expect(sha256Hex("JALVORO")).resolves.toBe(
      await sha256Hex("JALVORO"),
    );
  });
});
