import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const view = searchParams.get('view') || 'monthly' // monthly | quarterly

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
      .select('entry_date, entry_type, category, amount, description')
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

  // ──────────── Build a date→data map across the range ────────────

  // Sales by date
  const salesByDate: Record<string, number> = {}
  for (const s of sales ?? []) {
    salesByDate[s.report_date] = Number(s.total_amount) || 0
  }

  // All receipts by date (total expenses)
  const receiptExpenseByDate: Record<string, number> = {}
  // Ingredient costs by date
  const ingredientByDate: Record<string, number> = {}
  // Expenses by category by date
  const categoryByDate: Record<string, Record<string, number>> = {}
  const allCategories = new Set<string>()

  for (const r of receipts ?? []) {
    const d = r.receipt_date
    const amt = Number(r.total) || 0
    const cat = r.category || 'other'
    allCategories.add(cat)

    receiptExpenseByDate[d] = (receiptExpenseByDate[d] || 0) + amt
    if (!categoryByDate[d]) categoryByDate[d] = {}
    categoryByDate[d][cat] = (categoryByDate[d][cat] || 0) + amt

    if (cat === 'ingredients') {
      ingredientByDate[d] = (ingredientByDate[d] || 0) + amt
    }
  }

  // Fixed costs spread per month
  const fixedCostByMonth: Record<string, number> = {}
  // Electricity by month (for quarterly view)
  const electricityByMonth: Record<string, number> = {}
  for (const f of filteredFixed) {
    const key = `${f.period_year}-${String(f.period_month).padStart(2, '0')}`
    const amt = Number(f.amount) || 0
    fixedCostByMonth[key] = (fixedCostByMonth[key] || 0) + amt
    if ((f.category || '').toLowerCase() === 'electricity' || (f.name || '').toLowerCase().includes('electric') || (f.name || '').toLowerCase().includes('ไฟฟ้า')) {
      electricityByMonth[key] = (electricityByMonth[key] || 0) + amt
    }
  }

  // ──────────── MONTHLY VIEW: Daily time series ────────────

  // Build all dates in range
  const allDates: string[] = []
  const cursor = new Date(from + 'T12:00:00')
  const endDate = new Date(to + 'T12:00:00')
  while (cursor <= endDate) {
    allDates.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  // 1) Daily Sales vs All Expenses (line chart)
  const salesVsExpenses = allDates.map((d) => ({
    date: d,
    sales: salesByDate[d] || 0,
    expenses: receiptExpenseByDate[d] || 0,
  }))

  // 2) Daily Sales vs Ingredient Costs (line chart)
  const salesVsIngredients = allDates.map((d) => ({
    date: d,
    sales: salesByDate[d] || 0,
    ingredients: ingredientByDate[d] || 0,
  }))

  // 3) Sales vs Fixed Costs (monthly aggregated as a daily spread)
  // Spread fixed cost evenly across month's days
  const salesVsFixed = allDates.map((d) => {
    const monthKey = d.substring(0, 7)
    const daysInMonth = new Date(Number(d.substring(0, 4)), Number(d.substring(5, 7)), 0).getDate()
    const dailyFixed = (fixedCostByMonth[monthKey] || 0) / daysInMonth
    return {
      date: d,
      sales: salesByDate[d] || 0,
      fixedCosts: Math.round(dailyFixed),
    }
  })

  // 4) All expense categories separately (stacked/multi-line)
  const sortedCategories = [...allCategories].sort()
  const expenseCategoryDaily = allDates.map((d) => {
    const row: Record<string, unknown> = { date: d }
    for (const cat of sortedCategories) {
      row[cat] = categoryByDate[d]?.[cat] || 0
    }
    return row
  })

  // 5) Weather vs avg daily sales (bar chart)
  const weatherSales: Record<string, { total: number; count: number }> = {}
  for (const s of sales ?? []) {
    const w = s.weather || 'unknown'
    if (!weatherSales[w]) weatherSales[w] = { total: 0, count: 0 }
    weatherSales[w].total += Number(s.total_amount) || 0
    weatherSales[w].count += 1
  }
  const weatherVsSales = Object.entries(weatherSales)
    .map(([weather, d]) => ({
      weather: weather.charAt(0).toUpperCase() + weather.slice(1),
      avgSales: Math.round(d.total / d.count),
      days: d.count,
      totalSales: d.total,
    }))
    .sort((a, b) => b.avgSales - a.avgSales)

  // ──────────── QUARTERLY VIEW: Monthly aggregations ────────────

  // Build months in range
  const months: string[] = []
  const mCursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  while (mCursor <= toDate) {
    months.push(`${mCursor.getFullYear()}-${String(mCursor.getMonth() + 1).padStart(2, '0')}`)
    mCursor.setMonth(mCursor.getMonth() + 1)
  }

  // Weather avg temp by month (use weather frequency as proxy)
  const weatherByMonth: Record<string, Record<string, number>> = {}
  for (const s of sales ?? []) {
    const m = s.report_date.substring(0, 7)
    const w = s.weather || 'unknown'
    if (!weatherByMonth[m]) weatherByMonth[m] = {}
    weatherByMonth[m][w] = (weatherByMonth[m][w] || 0) + 1
  }

  // Electricity vs Weather (quarterly line chart)
  const electricityVsWeather = months.map((m) => {
    const weatherCounts = weatherByMonth[m] || {}
    const totalDays = Object.values(weatherCounts).reduce((a, b) => a + b, 0)
    const sunnyDays = weatherCounts['sunny'] || 0
    const rainyDays = weatherCounts['rainy'] || 0
    const cloudyDays = weatherCounts['cloudy'] || 0

    const monthLabel = new Date(m + '-15T12:00:00Z').toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      month: 'short',
      year: '2-digit',
    })

    return {
      month: m,
      monthLabel,
      electricity: electricityByMonth[m] || 0,
      sunnyDays,
      rainyDays,
      cloudyDays,
      totalDays,
    }
  })

  // Monthly sales aggregation for quarterly overview
  const monthlySales = months.map((m) => {
    let total = 0
    for (const s of sales ?? []) {
      if (s.report_date.startsWith(m)) {
        total += Number(s.total_amount) || 0
      }
    }
    let totalExpenses = 0
    for (const r of receipts ?? []) {
      if (r.receipt_date.startsWith(m)) {
        totalExpenses += Number(r.total) || 0
      }
    }
    const monthLabel = new Date(m + '-15T12:00:00Z').toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      month: 'short',
      year: '2-digit',
    })
    return {
      month: m,
      monthLabel,
      sales: total,
      expenses: totalExpenses,
      fixedCosts: fixedCostByMonth[m] || 0,
      profit: total - totalExpenses - (fixedCostByMonth[m] || 0),
    }
  })

  // ──────────── Summary KPIs ────────────
  const totalRevenue = (sales ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalReceiptExpenses = (receipts ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
  const totalFixedCosts = filteredFixed.reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const totalExpenses = totalReceiptExpenses + totalFixedCosts
  const totalIngredients = (receipts ?? []).filter((r) => r.category === 'ingredients').reduce((s, r) => s + (Number(r.total) || 0), 0)
  const daysCount = (sales ?? []).length || 1
  const totalTables = (sales ?? []).reduce((s, r) => s + (r.tables_served || 0), 0)
  const totalTogo = (sales ?? []).reduce((s, r) => s + (r.togo_orders || 0), 0)

  return NextResponse.json({
    view,
    // Summary
    summary: {
      totalRevenue,
      totalExpenses,
      totalReceiptExpenses,
      totalFixedCosts,
      totalIngredients,
      netProfit: totalRevenue - totalExpenses,
      avgDailySales: Math.round(totalRevenue / daysCount),
      daysReported: (sales ?? []).length,
      totalTables,
      totalTogo,
    },
    // Monthly view data
    salesVsExpenses,
    salesVsIngredients,
    salesVsFixed,
    expenseCategoryDaily,
    expenseCategories: sortedCategories,
    weatherVsSales,
    // Quarterly view data
    electricityVsWeather,
    monthlySales,
  })
}
