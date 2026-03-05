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

// POST: Seed reminders for a given month/year (creates all 6 if not existing)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { periodMonth, periodYear } = body

    if (!periodMonth || !periodYear) {
      return NextResponse.json({ error: 'Missing periodMonth or periodYear' }, { status: 400 })
    }

    // Create reminder rows for all 6 cost types (skip if already exists via UNIQUE constraint)
    const rows = COST_TYPES.map((costType) => ({
      cost_type: costType,
      period_month: periodMonth,
      period_year: periodYear,
      due_date: getDueDate(costType, periodMonth, periodYear),
      amount: 0,
      paid: false,
      user_id: user.id,
    }))

    const { data, error } = await supabase
      .from('fixed_cost_reminders')
      .upsert(rows, { onConflict: 'cost_type,period_month,period_year,user_id', ignoreDuplicates: true })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, reminders: data })
  } catch (error: unknown) {
    console.error('Error seeding reminders:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed reminders' },
      { status: 500 }
    )
  }
}

// PATCH: Mark a reminder as paid (or unpaid), optionally set amount
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, paid, amount } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (paid !== undefined) {
      updateData.paid = paid
      updateData.payment_date = paid ? getThaiToday() : null
    }
    if (amount !== undefined) {
      updateData.amount = Number(amount)
    }

    const { data: reminder, error } = await supabase
      .from('fixed_cost_reminders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, reminder })
  } catch (error: unknown) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update reminder' },
      { status: 500 }
    )
  }
}
