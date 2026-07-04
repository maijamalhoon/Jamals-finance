export const FALLBACK_USD_PKR_RATE = 281.2;

export async function getUsdToPkrRate() {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
      return { rate: FALLBACK_USD_PKR_RATE, live: false };
    }

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/PKR`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      return { rate: FALLBACK_USD_PKR_RATE, live: false };
    }

    const data = (await response.json()) as {
      result?: string;
      conversion_rate?: number;
    };

    if (data.result !== "success" || typeof data.conversion_rate !== "number") {
      return { rate: FALLBACK_USD_PKR_RATE, live: false };
    }

    return { rate: data.conversion_rate, live: true };
  } catch {
    return { rate: FALLBACK_USD_PKR_RATE, live: false };
  }
}
