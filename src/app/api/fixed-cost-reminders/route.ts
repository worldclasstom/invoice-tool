import { createClient } from '@/lib/supabase/server'
import { getThaiToday } from '@/lib/utils'
import { NextResponse } from 'next/server'

// The 6 fixed cost types and their default due-day logic
const COST_TYPES = [
  'WATER', 'ELECTRICITY', 'CREDIT_CARD_UOB', 'INTERNET',
  'EMPLOYEE_FIRST_HALF', 'EMPLOYEE_SECOND_HALF',
] as const

function getDueDate(costType: string, periodMonth: number, periodYear: number): string {
  const lastDay = new Date(periodYear, periodMonth, 0).getDate()
  if (costType === 'EMPLOYEE_FIRST_HALF') {
    // 16th of the month
    return `${periodYear}-${String(periodMonth).padStart(2, '0')}-16`
  }
  // Everything else: end of month
  return `${periodYear}-${String(periodMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// GET: Fetch all unpaid reminders from Feb 2026 onward
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: reminders, error } = await supabase
      .from('fixed_cost_reminders')
      .select('*')
      .eq('paid', false)
      .order('period_year', { ascending: true })
      .order('period_month', { ascending: true })
      .order('cost_type')

    if (error) throw error

    return NextResponse.json({ reminders: reminders ?? [] })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

// POST: Seed reminders
// If { seedAll: true } -> seeds ALL months from Feb 2026 through current month
// If { periodMonth, periodYear } -> seeds a single month
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { seedAll, periodMonth, periodYear } = body

    // Build list of (month, year) pairs to seed
    const periods: { m: number; y: number }[] = []

    if (seedAll) {
      // From Feb 2026 through the current Bangkok month
      const thaiToday = getThaiToday() // YYYY-MM-DD
      const currentYear = Number(thaiToday.split('-')[0])
      const currentMonth = Number(thaiToday.split('-')[1])
      let y = 2026
      let m = 2
      while (y < currentYear || (y === currentYear && m <= currentMonth)) {
        periods.push({ m, y })
        m++
        if (m > 12) { m = 1; y++ }
      }
    } else if (periodMonth && periodYear) {
      periods.push({ m: periodMonth, y: periodYear })
    } else {
      return NextResponse.json({ error: 'Provide { seedAll: true } or { periodMonth, periodYear }' }, { status: 400 })
    }

    // Build all rows for every period
    const rows = periods.flatMap(({ m, y }) =>
      COST_TYPES.map((costType) => ({
        cost_type: costType,
        period_month: m,
        period_year: y,
        due_date: getDueDate(costType, m, y),
        amount: 0,
        paid: false,
        user_id: user.id,
      }))
    )

    const { data, error } = await supabase
      .from('fixed_cost_reminders')
      .upsert(rows, { onConflict: 'cost_type,period_month,period_year,user_id', ignoreDuplicates: true })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, count: data?.length ?? 0 })
  } catch (error: unknown) {
    console.error('Error seeding reminders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed reminders' },
      { status: 500 }
    )
  }
}

// NOTE: No PATCH endpoint. Reminders are only updated via the
// fixed-costs API sync (syncReminderPaid) when a cost is marked paid.
