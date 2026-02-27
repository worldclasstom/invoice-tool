import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 })
  }

  const [
    { data: sales },
    { data: receipts },
    { data: fixedCosts },
    { data: ledger },
  ] = await Promise.all([
    supabase
      .from('daily_sales')
      .select('report_date, cash_amount, promptpay_amount, credit_card_amount, total_amount, tables_served, togo_orders, weather, busiest_times')
      .gte('report_date', from)
      .lte('report_date', to)
      .order('report_date', { ascending: true }),
    supabase
      .from('receipts')
      .select('receipt_date, vendor, total, category')
      .gte('receipt_date', from)
      .lte('receipt_date', to)
      .order('receipt_date', { ascending: true }),
    supabase
      .from('fixed_costs')
      .select('name, category, amount, is_paid, period_month, period_year'),
    supabase
      .from('ledger_entries')
      .select('entry_date, entry_type, category, amount')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: true }),
  ])

  // Filter fixed costs to months within range
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const filteredFixed = (fixedCosts ?? []).filter((f) => {
    const costDate = new Date(f.period_year, f.period_month - 1, 1)
    const costEndDate = new Date(f.period_year, f.period_month, 0)
    return costDate <= toDate && costEndDate >= fromDate
  })

  // --- Aggregate data ---

  // 1) Daily revenue trend
  const dailyRevenue = (sales ?? []).map((s) => ({
    date: s.report_date,
    total: Number(s.total_amount) || 0,
    cash: Number(s.cash_amount) || 0,
    promptpay: Number(s.promptpay_amount) || 0,
    creditCard: Number(s.credit_card_amount) || 0,
    tables: s.tables_served || 0,
    togo: s.togo_orders || 0,
  }))

  // 2) Payment method totals
  const paymentMethods = {
    cash: (sales ?? []).reduce((s, r) => s + (Number(r.cash_amount) || 0), 0),
    promptpay: (sales ?? []).reduce((s, r) => s + (Number(r.promptpay_amount) || 0), 0),
    creditCard: (sales ?? []).reduce((s, r) => s + (Number(r.credit_card_amount) || 0), 0),
  }

  // 3) Expense by category from receipts
  const expenseByCategory: Record<string, number> = {}
  for (const r of receipts ?? []) {
    const cat = r.category || 'Other'
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(r.total) || 0)
  }

  // 4) Top vendors by spend
  const vendorSpend: Record<string, number> = {}
  for (const r of receipts ?? []) {
    const v = r.vendor || 'Unknown'
    vendorSpend[v] = (vendorSpend[v] || 0) + (Number(r.total) || 0)
  }
  const topVendors = Object.entries(vendorSpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }))

  // 5) Revenue vs Expenses by date
  const revenueByDate: Record<string, number> = {}
  const expenseByDate: Record<string, number> = {}
  for (const e of ledger ?? []) {
    const d = e.entry_date
    if (e.entry_type === 'revenue') {
      revenueByDate[d] = (revenueByDate[d] || 0) + (Number(e.amount) || 0)
    } else {
      expenseByDate[d] = (expenseByDate[d] || 0) + (Number(e.amount) || 0)
    }
  }
  const allDates = [...new Set([...Object.keys(revenueByDate), ...Object.keys(expenseByDate)])].sort()
  const revenueVsExpense = allDates.map((d) => ({
    date: d,
    revenue: revenueByDate[d] || 0,
    expense: expenseByDate[d] || 0,
    profit: (revenueByDate[d] || 0) - (expenseByDate[d] || 0),
  }))

  // 6) Summary KPIs
  const totalRevenue = dailyRevenue.reduce((s, d) => s + d.total, 0)
  const totalExpenses = (receipts ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
    + filteredFixed.reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const totalTables = dailyRevenue.reduce((s, d) => s + d.tables, 0)
  const totalTogo = dailyRevenue.reduce((s, d) => s + d.togo, 0)
  const daysCount = dailyRevenue.length || 1
  const avgDailySales = totalRevenue / daysCount

  // 7) Fixed costs breakdown
  const fixedByCategory: Record<string, { total: number; paid: number; unpaid: number }> = {}
  for (const f of filteredFixed) {
    const cat = f.category || 'Other'
    if (!fixedByCategory[cat]) fixedByCategory[cat] = { total: 0, paid: 0, unpaid: 0 }
    const amt = Number(f.amount) || 0
    fixedByCategory[cat].total += amt
    if (f.is_paid) fixedByCategory[cat].paid += amt
    else fixedByCategory[cat].unpaid += amt
  }

  // 8) Weather impact (avg sales by weather)
  const weatherSales: Record<string, { total: number; count: number }> = {}
  for (const s of sales ?? []) {
    const w = s.weather || 'unknown'
    if (!weatherSales[w]) weatherSales[w] = { total: 0, count: 0 }
    weatherSales[w].total += Number(s.total_amount) || 0
    weatherSales[w].count += 1
  }
  const weatherImpact = Object.entries(weatherSales).map(([weather, d]) => ({
    weather,
    avgSales: Math.round(d.total / d.count),
    days: d.count,
  }))

  // 9) Busiest times aggregation
  const timeSlotCount: Record<string, number> = {}
  for (const s of sales ?? []) {
    if (Array.isArray(s.busiest_times)) {
      for (const t of s.busiest_times) {
        timeSlotCount[t] = (timeSlotCount[t] || 0) + 1
      }
    }
  }
  const busiestTimes = Object.entries(timeSlotCount)
    .sort((a, b) => b[1] - a[1])
    .map(([time, count]) => ({ time, count }))

  return NextResponse.json({
    dailyRevenue,
    paymentMethods,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, amount]) => ({ name, amount })),
    topVendors,
    revenueVsExpense,
    fixedCosts: Object.entries(fixedByCategory).map(([name, d]) => ({ name, ...d })),
    weatherImpact,
    busiestTimes,
    summary: {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      avgDailySales: Math.round(avgDailySales),
      totalTables,
      totalTogo,
      daysReported: dailyRevenue.length,
    },
  })
}
