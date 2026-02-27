import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const view = searchParams.get('view') || 'monthly' // monthly | quarterly | yearly

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to params' }, { status: 400 })
  }

  const [
    { data: sales },
    { data: receipts },
    { data: fixedCosts },
    { data: ledger },
    { data: adCosts },
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
    supabase
      .from('ad_costs')
      .select('platform, start_date, end_date, amount, period_type')
      .lte('start_date', to)
      .gte('end_date', from)
      .order('start_date', { ascending: true }),
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
  const sortedCategories = Array.from(allCategories).sort()
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

  // ──────────── Payment Methods breakdown ────────────
  let totalCash = 0, totalPromptPay = 0, totalCreditCard = 0
  for (const s of sales ?? []) {
    totalCash += Number(s.cash_amount) || 0
    totalPromptPay += Number(s.promptpay_amount) || 0
    totalCreditCard += Number(s.credit_card_amount) || 0
  }
  const paymentMethods = [
    { name: 'Cash', value: totalCash },
    { name: 'PromptPay', value: totalPromptPay },
    { name: 'Credit Card', value: totalCreditCard },
  ].filter((p) => p.value > 0)

  // ──────────── Top Vendors ────────────
  const vendorInfo: Record<string, { total: number; category: string }> = {}
  for (const r of receipts ?? []) {
    const v = r.vendor || 'Unknown'
    if (!vendorInfo[v]) vendorInfo[v] = { total: 0, category: r.category || 'other' }
    vendorInfo[v].total += Number(r.total) || 0
  }
  const topVendors = Object.entries(vendorInfo)
    .map(([vendor, info]) => ({ vendor, total: info.total, category: info.category }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ──────────── Busiest Times ────────────
  const timesMap: Record<string, number> = {}
  for (const s of sales ?? []) {
    if (s.busiest_times) {
      const times = String(s.busiest_times).split(',').map((t: string) => t.trim()).filter(Boolean)
      for (const t of times) {
        timesMap[t] = (timesMap[t] || 0) + 1
      }
    }
  }
  const busiestTimes = Object.entries(timesMap)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // ──────────── Service Breakdown (dine-in vs to-go) ────────────
  const totalTables = (sales ?? []).reduce((s, r) => s + (r.tables_served || 0), 0)
  const totalTogo = (sales ?? []).reduce((s, r) => s + (r.togo_orders || 0), 0)
  const serviceBreakdown = [
    { name: 'Dine-in (Tables)', value: totalTables },
    { name: 'To-Go Orders', value: totalTogo },
  ].filter((s) => s.value > 0)

  // ──────────── Fixed Costs Detail ────────────
  const fixedCostsDetail = filteredFixed.map((f) => ({
    name: f.name,
    category: f.category,
    amount: Number(f.amount) || 0,
    isPaid: f.is_paid,
    month: f.period_month,
    year: f.period_year,
  })).sort((a, b) => b.amount - a.amount)

  // ──────────── Expense Category Totals (for pie/donut) ────────────
  const categoryTotals = Object.entries(
    (receipts ?? []).reduce((acc: Record<string, number>, r) => {
      const cat = r.category || 'other'
      acc[cat] = (acc[cat] || 0) + (Number(r.total) || 0)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value)

  // ──────────── Summary KPIs ────────────
  const totalRevenue = (sales ?? []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalReceiptExpenses = (receipts ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
  const totalFixedCostsSum = filteredFixed.reduce((s, f) => s + (Number(f.amount) || 0), 0)
  const totalExpenses = totalReceiptExpenses + totalFixedCostsSum
  const totalIngredients = (receipts ?? []).filter((r) => r.category === 'ingredients').reduce((s, r) => s + (Number(r.total) || 0), 0)
  const daysCount = (sales ?? []).length || 1

  // ──────────── Ad Spend vs Income ────────────
  // Spread each ad_cost entry evenly across the days it covers
  const adSpendByDate: Record<string, { facebook: number; tiktok: number; instagram: number; influencers: number; others: number }> = {}
  for (const ad of adCosts ?? []) {
    const adStart = new Date(Math.max(new Date(ad.start_date + 'T00:00:00').getTime(), new Date(from + 'T00:00:00').getTime()))
    const adEnd = new Date(Math.min(new Date(ad.end_date + 'T00:00:00').getTime(), new Date(to + 'T00:00:00').getTime()))
    const totalDays = Math.max(1, Math.round((adEnd.getTime() - adStart.getTime()) / 86400000) + 1)
    const dailyAmount = (Number(ad.amount) || 0) / totalDays
    const platform = ad.platform as 'facebook' | 'tiktok' | 'instagram' | 'influencers' | 'others'
    const c = new Date(adStart)
    while (c <= adEnd) {
      const key = c.toISOString().split('T')[0]
      if (!adSpendByDate[key]) adSpendByDate[key] = { facebook: 0, tiktok: 0, instagram: 0, influencers: 0, others: 0 }
      adSpendByDate[key][platform] += dailyAmount
      c.setDate(c.getDate() + 1)
    }
  }

  // Daily: Ad Spend vs Income (for monthly view)
  const adSpendVsIncomeDaily = allDates.map((d) => {
    const ad = adSpendByDate[d] || { facebook: 0, tiktok: 0, instagram: 0, influencers: 0, others: 0 }
    return {
      date: d,
      income: salesByDate[d] || 0,
      facebook: Math.round(ad.facebook),
      tiktok: Math.round(ad.tiktok),
      instagram: Math.round(ad.instagram),
      influencers: Math.round(ad.influencers),
      others: Math.round(ad.others),
      totalAds: Math.round(ad.facebook + ad.tiktok + ad.instagram + ad.influencers + ad.others),
    }
  })

  // Monthly: Ad Spend vs Income (for quarterly/yearly view)
  const adSpendVsIncomeMonthly = months.map((m) => {
    let income = 0
    let facebook = 0, tiktok = 0, instagram = 0, influencers = 0, others = 0
    for (const s of sales ?? []) {
      if (s.report_date.startsWith(m)) income += Number(s.total_amount) || 0
    }
    for (const d of allDates.filter((dd) => dd.startsWith(m))) {
      const ad = adSpendByDate[d] || { facebook: 0, tiktok: 0, instagram: 0, influencers: 0, others: 0 }
      facebook += ad.facebook
      tiktok += ad.tiktok
      instagram += ad.instagram
      influencers += ad.influencers
      others += ad.others
    }
    const monthLabel = new Date(m + '-15T12:00:00Z').toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      month: 'short',
      year: '2-digit',
    })
    return {
      month: m,
      monthLabel,
      income: Math.round(income),
      facebook: Math.round(facebook),
      tiktok: Math.round(tiktok),
      instagram: Math.round(instagram),
      influencers: Math.round(influencers),
      others: Math.round(others),
      totalAds: Math.round(facebook + tiktok + instagram + influencers + others),
    }
  })

  // Total ad spend for summary
  const totalAdSpend = (adCosts ?? []).reduce((s, a) => s + (Number(a.amount) || 0), 0)

  return NextResponse.json({
    view,
    summary: {
      totalRevenue,
      totalExpenses,
      totalReceiptExpenses,
      totalFixedCosts: totalFixedCostsSum,
      totalIngredients,
      netProfit: totalRevenue - totalExpenses,
      avgDailySales: Math.round(totalRevenue / daysCount),
      daysReported: (sales ?? []).length,
      totalTables,
      totalTogo,
      totalAdSpend,
    },
    // Monthly charts
    salesVsExpenses,
    salesVsIngredients,
    salesVsFixed,
    expenseCategoryDaily,
    expenseCategories: sortedCategories,
    weatherVsSales,
    // Quarterly charts
    electricityVsWeather,
    monthlySales,
    // Shared / previous charts
    paymentMethods,
    topVendors,
    busiestTimes,
    serviceBreakdown,
    fixedCostsDetail,
    categoryTotals,
    // Ad spend charts
    adSpendVsIncomeDaily,
    adSpendVsIncomeMonthly,
  })
}
