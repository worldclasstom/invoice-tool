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

  if (format === 'csv') {
    // Build CSV with multiple sections
    const lines: string[] = []

    // Section 1: Summary
    lines.push('=== TAX EXPORT SUMMARY ===')
    lines.push(`Period,${from} to ${to}`)
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

    // Section 2: Expense breakdown
    lines.push('=== EXPENSE BREAKDOWN BY CATEGORY ===')
    lines.push('Category,Amount')
    for (const [cat, amt] of Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])) {
      lines.push(`${cat},"${amt.toFixed(2)}"`)
    }
    lines.push('')

    // Section 3: Daily Sales
    lines.push('=== DAILY SALES ===')
    lines.push('Date,Cash,PromptPay,Credit Card,Total,Tables,To-Go')
    for (const s of sales ?? []) {
      lines.push(`${s.report_date},"${Number(s.cash_amount).toFixed(2)}","${Number(s.promptpay_amount).toFixed(2)}","${Number(s.credit_card_amount).toFixed(2)}","${Number(s.total_amount).toFixed(2)}",${s.tables_served},${s.togo_orders}`)
    }
    lines.push('')

    // Section 4: Receipts
    lines.push('=== RECEIPTS & EXPENSES ===')
    lines.push('Date,Vendor,Category,Description,Amount')
    for (const r of receipts ?? []) {
      const desc = (r.description || '').replace(/"/g, '""')
      lines.push(`${r.receipt_date},"${r.vendor}","${r.category || ''}","${desc}","${Number(r.total).toFixed(2)}"`)
    }
    lines.push('')

    // Section 5: Fixed Costs
    lines.push('=== FIXED COSTS ===')
    lines.push('Name,Category,Amount,Paid,Month,Year')
    for (const f of filteredFixed) {
      lines.push(`"${f.name}","${f.category}","${Number(f.amount).toFixed(2)}",${f.is_paid ? 'Yes' : 'No'},${f.period_month},${f.period_year}`)
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
    salesCount: (sales ?? []).length,
    receiptsCount: (receipts ?? []).length,
    fixedCostsCount: filteredFixed.length,
    sales: sales ?? [],
    receipts: receipts ?? [],
    fixedCosts: filteredFixed,
  })
}
