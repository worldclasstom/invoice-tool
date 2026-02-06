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
    { data: ledgerEntries },
    { data: sales },
    { data: receipts },
    { data: fixedCosts },
  ] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('*')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: false })
      .limit(200),
    supabase
      .from('daily_sales')
      .select('*')
      .gte('report_date', from)
      .lte('report_date', to),
    supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', from)
      .lte('receipt_date', to),
    supabase
      .from('fixed_costs')
      .select('*'),
  ])

  // Filter fixed costs to months that overlap with the date range
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const filteredFixed = (fixedCosts ?? []).filter((f) => {
    const costDate = new Date(f.period_year, f.period_month - 1, 1)
    const costEndDate = new Date(f.period_year, f.period_month, 0)
    return costDate <= toDate && costEndDate >= fromDate
  })

  return NextResponse.json({
    ledgerEntries: ledgerEntries ?? [],
    sales: sales ?? [],
    receipts: receipts ?? [],
    fixedCosts: filteredFixed,
  })
}
