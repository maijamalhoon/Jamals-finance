import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY

    if (!apiKey) {
      return NextResponse.json({ rate: 281.20, live: false })
    }

    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/USD/PKR`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    const data = await res.json()

    if (data.result !== 'success') {
      return NextResponse.json({ rate: 281.20, live: false })
    }

    return NextResponse.json({ rate: data.conversion_rate, live: true })

  } catch {
    return NextResponse.json({ rate: 281.20, live: false })
  }
}