import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const format = searchParams.get('format') || 'json' // json | csv

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 })
  }

  // Fetch all transaction data in parallel
  const [
    { data: sales },
    { data: receipts },
    { data: fixedCosts },
  ] = await Promise.all([
    supabase
      .from('daily_sales')
      .select('report_date, cash_amount, promptpay_amount, credit_card_amount, total_amount, tables_served, togo_orders')
      .gte('report_date', from)
      .lte('report_date', to)
      .order('report_date', { ascending: true }),
    supabase
      .from('receipts')
      .select('receipt_date, vendor, total, category, description')
      .gte('receipt_date', from)
      .lte('receipt_date', to)
      .order('receipt_date', { ascending: true }),
    supabase
      .from('fixed_costs')
      .select('name, category, amount, is_paid, period_month, period_year'),
  ])

  // Filter fixed costs to months within range
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const filteredFixed = (fixedCosts ?? []).filter((f) => {
    const costDate = new Date(f.period_year, f.period_month - 1, 1)
    const costEndDate = new Date(f.period_year, f.period_month, 0)
    return costDate <= toDate && costEndDate >= fromDate
  })

  // Calculate summary
  const totalRevenue = (sales ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalCash = (sales ?? []).reduce((s, r) => s + (Number(r.cash_amount) || 0), 0)
  const totalPromptpay = (sales ?? []).reduce((s, r) => s + (Number(r.promptpay_amount) || 0), 0)
  const totalCreditCard = (sales ?? []).reduce((s, r) => s + (Number(r.credit_card_amount) || 0), 0)
  const totalReceiptExpenses = (receipts ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
  const totalFixedCosts = filteredFixed.reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const totalExpenses = totalReceiptExpenses + totalFixedCosts
  const netProfit = totalRevenue - totalExpenses
  const daysReported = (sales ?? []).length

  // Expense breakdown by category
  const expensesByCategory: Record<string, number> = {}
  for (const r of receipts ?? []) {
    const cat = r.category || 'uncategorized'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(r.total) || 0)
  }
  for (const f of filteredFixed) {
    const cat = f.category || 'fixed'
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(f.amount) || 0)
  }

  // Build monthly aggregation
  const monthlyData: Record<string, { income: number; cash: number; promptpay: number; creditCard: number; receiptExpenses: number; fixedCosts: number; days: number }> = {}

  // Helper to init a month key
  const initMonth = (key: string) => {
    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, cash: 0, promptpay: 0, creditCard: 0, receiptExpenses: 0, fixedCosts: 0, days: 0 }
    }
  }

  // Aggregate sales by month
  for (const s of sales ?? []) {
    const key = String(s.report_date).substring(0, 7) // "YYYY-MM"
    initMonth(key)
    monthlyData[key].income += Number(s.total_amount) || 0
    monthlyData[key].cash += Number(s.cash_amount) || 0
    monthlyData[key].promptpay += Number(s.promptpay_amount) || 0
    monthlyData[key].creditCard += Number(s.credit_card_amount) || 0
    monthlyData[key].days += 1
  }

  // Aggregate receipt expenses by month
  for (const r of receipts ?? []) {
    const key = String(r.receipt_date).substring(0, 7)
    initMonth(key)
    monthlyData[key].receiptExpenses += Number(r.total) || 0
  }

  // Aggregate fixed costs by month
  for (const f of filteredFixed) {
    const key = `${f.period_year}-${String(f.period_month).padStart(2, '0')}`
    initMonth(key)
    monthlyData[key].fixedCosts += Number(f.amount) || 0
  }

  const sortedMonths = Object.keys(monthlyData).sort()

  if (format === 'csv') {
    const lines: string[] = []

    // Section 1: Fiscal Summary
    lines.push('=== FISCAL YEAR SUMMARY ===')
    lines.push(`Period,"${from} to ${to}"`)
    lines.push(`Days Reported,${daysReported}`)
    lines.push(`Total Revenue,"${totalRevenue.toFixed(2)}"`)
    lines.push(`Total Cash,"${totalCash.toFixed(2)}"`)
    lines.push(`Total PromptPay,"${totalPromptpay.toFixed(2)}"`)
    lines.push(`Total Credit Card,"${totalCreditCard.toFixed(2)}"`)
    lines.push(`Total Receipt Expenses,"${totalReceiptExpenses.toFixed(2)}"`)
    lines.push(`Total Fixed Costs,"${totalFixedCosts.toFixed(2)}"`)
    lines.push(`Total Expenses,"${totalExpenses.toFixed(2)}"`)
    lines.push(`Net Profit/Loss,"${netProfit.toFixed(2)}"`)
    lines.push('')

    // Section 2: Monthly Breakdown
    lines.push('=== MONTHLY BREAKDOWN ===')
    lines.push('Month,Income,Receipt Expenses,Fixed Costs,Total Expenses,Net Profit/Loss,Days')
    for (const m of sortedMonths) {
      const d = monthlyData[m]
      const monthExpenses = d.receiptExpenses + d.fixedCosts
      const monthNet = d.income - monthExpenses
      lines.push(`${m},"${d.income.toFixed(2)}","${d.receiptExpenses.toFixed(2)}","${d.fixedCosts.toFixed(2)}","${monthExpenses.toFixed(2)}","${monthNet.toFixed(2)}",${d.days}`)
    }

    const csv = lines.join('\n')
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tax-export-${from}-to-${to}.csv"`,
      },
    })
  }

  // Build monthly rows for JSON preview
  const monthlyRows = sortedMonths.map((m) => {
    const d = monthlyData[m]
    const monthExpenses = d.receiptExpenses + d.fixedCosts
    return {
      month: m,
      income: d.income,
      cash: d.cash,
      promptpay: d.promptpay,
      creditCard: d.creditCard,
      receiptExpenses: d.receiptExpenses,
      fixedCosts: d.fixedCosts,
      totalExpenses: monthExpenses,
      netProfit: d.income - monthExpenses,
      days: d.days,
    }
  })

  // JSON response (for preview/summary)
  return NextResponse.json({
    period: { from, to },
    summary: {
      daysReported,
      totalRevenue,
      totalCash,
      totalPromptpay,
      totalCreditCard,
      totalReceiptExpenses,
      totalFixedCosts,
      totalExpenses,
      netProfit,
    },
    expensesByCategory,
    monthlyRows,
    salesCount: (sales ?? []).length,
    receiptsCount: (receipts ?? []).length,
    fixedCostsCount: filteredFixed.length,
  })
}
