import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, category, amount, paymentMethod, dueDay, periodMonth, periodYear, notes, isRecurring, receiptImageUrl } = body

    const { data: cost, error } = await supabase
      .from('fixed_costs')
      .insert({
        name,
        category,
        amount: Number(amount),
        payment_method: paymentMethod || 'cash',
        due_day: dueDay || null,
        is_paid: false,
        is_recurring: isRecurring !== undefined ? isRecurring : true,
        period_month: periodMonth,
        period_year: periodYear,
        notes: notes || null,
        receipt_image_url: receiptImageUrl || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'created',
      entityType: 'fixed_cost',
      entityId: cost.id,
      details: { name, amount: Number(amount), category },
    })

    return NextResponse.json({ success: true, cost })
  } catch (error: unknown) {
    console.error('Error saving fixed cost:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save fixed cost' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1)
    const year = Number(searchParams.get('year') || new Date().getFullYear())

    const { data: costs, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('period_month', month)
      .eq('period_year', year)
      .order('name')

    if (error) throw error

    return NextResponse.json({ costs })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fixed costs' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, isPaid } = body

    const updateData: Record<string, unknown> = {
      is_paid: isPaid,
      updated_at: new Date().toISOString(),
    }
    if (isPaid) {
      updateData.paid_date = new Date().toISOString().split('T')[0]
    } else {
      updateData.paid_date = null
    }

    const { data: cost, error } = await supabase
      .from('fixed_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create or remove ledger entry
    if (isPaid) {
      await supabase.from('ledger_entries').insert({
        entry_date: new Date().toISOString().split('T')[0],
        description: `Fixed cost - ${cost.name}`,
        entry_type: 'expense',
        category: cost.category,
        amount: Number(cost.amount),
        payment_method: cost.payment_method,
        reference_type: 'fixed_cost',
        reference_id: cost.id,
        user_id: user.id,
      })
    } else {
      await supabase
        .from('ledger_entries')
        .delete()
        .eq('reference_type', 'fixed_cost')
        .eq('reference_id', id)
    }

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: isPaid ? 'marked_paid' : 'marked_unpaid',
      entityType: 'fixed_cost',
      entityId: cost.id,
      details: { name: cost.name, amount: Number(cost.amount) },
    })

    return NextResponse.json({ success: true, cost })
  } catch (error: unknown) {
    console.error('Error updating fixed cost:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    )
  }
}
