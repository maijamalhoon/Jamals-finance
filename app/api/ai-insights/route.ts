import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const client   = new Anthropic()
    const now      = new Date()

    // Fetch last 2 months of data
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString().split('T')[0]

    const [{ data: transactions }, { data: goals }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name)')
        .gte('date', twoMonthsAgo)
        .order('date', { ascending: false }),
      supabase.from('goals').select('*'),
    ])

    const txns = transactions ?? []

    // This month
    const thisMon = txns.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })

    // Last month
    const lastMon = txns.filter(t => {
      const d = new Date(t.date)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()
    })

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
${goals?.map(g => `- ${g.name}: ${((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(0)}% done`).join('\n') || '- No goals set'}

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
    const result = JSON.parse(text)

    return NextResponse.json(result)

  } catch {
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
