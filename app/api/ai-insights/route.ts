import Anthropic, { APIError, RateLimitError } from '@anthropic-ai/sdk'
import { getAppMonthRange } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const AI_UNAVAILABLE_MESSAGE =
  'AI insights are temporarily unavailable. Try again later.'

type InsightType = 'positive' | 'warning' | 'tip'

type GeneratedInsight = {
  type: InsightType
  title: string
  message: string
}

type GeneratedInsights = {
  healthScore: number
  healthLabel: string
  insights: GeneratedInsight[]
}

function errorResponse(
  error: string,
  status: number,
  message = AI_UNAVAILABLE_MESSAGE,
) {
  return NextResponse.json({ error, message }, { status })
}

function logSafeError(context: string, error: unknown) {
  if (error instanceof APIError) {
    console.error(context, {
      name: error.name,
      status: error.status,
      type: error.type,
    })
    return
  }

  if (error instanceof Error) {
    console.error(context, {
      name: error.name,
      message: error.message,
    })
    return
  }

  console.error(context, { name: 'UnknownError' })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseInsights(text: string): GeneratedInsights | null {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  if (!isRecord(parsed)) return null

  const score = parsed.healthScore
  const label = parsed.healthLabel
  const insights = parsed.insights

  if (
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    typeof label !== 'string' ||
    !Array.isArray(insights)
  ) {
    return null
  }

  const safeInsights = insights
    .map((insight): GeneratedInsight | null => {
      if (!isRecord(insight)) return null

      const { type, title, message } = insight

      if (
        (type !== 'positive' && type !== 'warning' && type !== 'tip') ||
        typeof title !== 'string' ||
        typeof message !== 'string'
      ) {
        return null
      }

      return {
        type,
        title: title.slice(0, 120),
        message: message.slice(0, 360),
      }
    })
    .filter((insight): insight is GeneratedInsight => Boolean(insight))

  if (safeInsights.length === 0) return null

  return {
    healthScore: Math.max(0, Math.min(100, Math.round(score))),
    healthLabel: label.slice(0, 40),
    insights: safeInsights.slice(0, 4),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse(
        'authentication_required',
        401,
        'Please log in before using AI insights.',
      )
    }

    const { firstDay, lastDay, lastFirst, lastLast } = getAppMonthRange()

    const [
      { data: transactions, error: transactionsError },
      { data: goals, error: goalsError },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name)')
        .gte('date', lastFirst)
        .lte('date', lastDay)
        .order('date', { ascending: false }),
      supabase.from('goals').select('*'),
    ])

    if (transactionsError || goalsError) {
      console.error('AI insights data query failed', {
        transactions: transactionsError
          ? { code: transactionsError.code, message: transactionsError.message }
          : null,
        goals: goalsError
          ? { code: goalsError.code, message: goalsError.message }
          : null,
      })

      return errorResponse('data_unavailable', 500)
    }

    const txns = transactions ?? []
    const goalRows = goals ?? []

    if (txns.length === 0 && goalRows.length === 0) {
      return NextResponse.json({
        empty: true,
        message: 'Add transactions to get personalized AI insights.',
        insights: [],
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()

    if (!apiKey) {
      console.error('AI insights unavailable: missing ANTHROPIC_API_KEY')
      return errorResponse('missing_ai_configuration', 503)
    }

    const client = new Anthropic({ apiKey })

    // This month
    const thisMon = txns.filter(t => t.date >= firstDay && t.date <= lastDay)

    // Last month
    const lastMon = txns.filter(t => t.date >= lastFirst && t.date <= lastLast)

    const income      = thisMon.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0)
    const expenses    = thisMon.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const lastIncome  = lastMon.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0)
    const lastExpenses= lastMon.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const savingsRate = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : '0'

    // Category breakdown
    const catMap: Record<string, number> = {}
    thisMon.filter(t => t.type === 'expense').forEach(t => {
      const name = (t.categories as any)?.name || 'Other'
      catMap[name] = (catMap[name] || 0) + Number(t.amount)
    })

    const prompt = `You are a personal finance AI assistant. Analyze this financial data and provide exactly 4 concise insights.

THIS MONTH:
- Income:   PKR ${income.toLocaleString()}
- Expenses: PKR ${expenses.toLocaleString()}
- Net:      PKR ${(income - expenses).toLocaleString()}
- Savings Rate: ${savingsRate}%

LAST MONTH:
- Income:   PKR ${lastIncome.toLocaleString()}
- Expenses: PKR ${lastExpenses.toLocaleString()}

SPENDING BY CATEGORY:
${Object.entries(catMap).map(([k, v]) => `- ${k}: PKR ${v.toLocaleString()}`).join('\n') || '- No expense data'}

GOALS:
${goalRows.map(g => `- ${g.name}: ${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(0)}% done`).join('\n') || '- No goals set'}

Respond ONLY with valid JSON. No markdown. No explanation. This exact format:
{
  "healthScore": <0-100>,
  "healthLabel": "<Excellent|Good|Fair|Needs Attention>",
  "insights": [
    { "type": "<positive|warning|tip>", "title": "<short title>", "message": "<2 sentences max>" },
    { "type": "<positive|warning|tip>", "title": "<short title>", "message": "<2 sentences max>" },
    { "type": "<positive|warning|tip>", "title": "<short title>", "message": "<2 sentences max>" },
    { "type": "<positive|warning|tip>", "title": "<short title>", "message": "<2 sentences max>" }
  ]
}`

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text   = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    const result = parseInsights(text)

    if (!result) {
      console.error('AI insights provider returned invalid JSON shape')
      return errorResponse('invalid_ai_response', 502)
    }

    return NextResponse.json(result)

  } catch (error) {
    logSafeError('AI insights provider request failed', error)

    if (error instanceof RateLimitError) {
      return errorResponse('ai_rate_limited', 429)
    }

    return errorResponse('ai_provider_unavailable', 503)
  }
}
