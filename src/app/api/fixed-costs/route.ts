import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { getThaiToday, getThaiISOString } from '@/lib/utils'
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

    // Fetch all unpaid fixed costs from Feb 2026 onwards
    if (searchParams.get('unpaid') === 'true') {
      const { data: unpaidCosts, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('is_paid', false)
        .or('period_year.gt.2026,and(period_year.eq.2026,period_month.gte.2)')
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true })
        .order('name')

      if (error) throw error
      return NextResponse.json({ costs: unpaidCosts })
    }

    const thaiToday = getThaiToday()
    const month = Number(searchParams.get('month') || Number(thaiToday.split('-')[1]))
    const year = Number(searchParams.get('year') || Number(thaiToday.split('-')[0]))

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
      updated_at: getThaiISOString(),
    }
    if (isPaid) {
      updateData.paid_date = getThaiToday()
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
        entry_date: getThaiToday(),
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

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, category, amount, paymentMethod, dueDay, notes, isRecurring, receiptImageUrl } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updateData: Record<string, unknown> = {
      name,
      category,
      amount: Number(amount),
      payment_method: paymentMethod || 'Cash',
      due_day: dueDay || null,
      is_recurring: isRecurring !== undefined ? isRecurring : true,
      notes: notes || null,
      receipt_image_url: receiptImageUrl || null,
    }

    const { data: cost, error } = await supabase
      .from('fixed_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update associated ledger entries if they exist
    await supabase
      .from('ledger_entries')
      .update({
        description: `Fixed cost - ${name}`,
        category,
        amount: Number(amount),
        payment_method: paymentMethod || 'Cash',
      })
      .eq('reference_type', 'fixed_cost')
      .eq('reference_id', id)

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'updated',
      entityType: 'fixed_cost',
      entityId: id,
      details: { name, amount: Number(amount), category },
    })

    return NextResponse.json({ success: true, cost })
  } catch (error: unknown) {
    console.error('Error updating fixed cost:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update fixed cost' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Get the cost details before deleting for activity log
    const { data: cost } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('id', id)
      .single()

    // Delete associated ledger entries
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('reference_type', 'fixed_cost')
      .eq('reference_id', id)

    // Delete the fixed cost
    const { error } = await supabase
      .from('fixed_costs')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (cost) {
      await logActivity({
        supabase,
        userId: user.id,
        userEmail: user.email || '',
        action: 'deleted',
        entityType: 'fixed_cost',
        entityId: id,
        details: { name: cost.name, amount: Number(cost.amount), category: cost.category },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting fixed cost:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete fixed cost' },
      { status: 500 }
    )
  }
}
