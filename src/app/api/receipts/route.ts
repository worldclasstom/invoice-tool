import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { receiptDate, vendor, total, category, notes, imageUrl, isManual } = body

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        receipt_date: receiptDate,
        vendor,
        total: Number(total),
        category: category || 'ingredients',
        notes: notes || null,
        image_url: imageUrl || null,
        is_manual: isManual ?? false,
        user_id: user.id,
      })
      .select()
      .single()

    if (receiptError) throw receiptError

    // Create ledger entry for expense
    await supabase.from('ledger_entries').insert({
      entry_date: receiptDate,
      description: `Receipt - ${vendor}`,
      entry_type: 'expense',
      category: category || 'ingredients',
      amount: Number(total),
      payment_method: null,
      reference_type: 'receipt',
      reference_id: receipt.id,
      user_id: user.id,
    })

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'created',
      entityType: 'receipt',
      entityId: receipt.id,
      details: { vendor, total: Number(total), category: category || 'ingredients' },
    })

    return NextResponse.json({ success: true, receipt })
  } catch (error: unknown) {
    console.error('Error saving receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save receipt' },
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
    const limit = Number(searchParams.get('limit') || 50)

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('*')
      .order('receipt_date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ receipts })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch receipts' },
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
    const { id, receiptDate, vendor, total, category, notes, imageUrl, isManual } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: receipt, error } = await supabase
      .from('receipts')
      .update({
        receipt_date: receiptDate,
        vendor,
        total: Number(total),
        category: category || 'ingredients',
        notes: notes || null,
        image_url: imageUrl || null,
        is_manual: isManual ?? false,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Update associated ledger entries
    await supabase
      .from('ledger_entries')
      .update({
        entry_date: receiptDate,
        description: `Receipt - ${vendor}`,
        category: category || 'ingredients',
        amount: Number(total),
      })
      .eq('reference_type', 'receipt')
      .eq('reference_id', id)

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'updated',
      entityType: 'receipt',
      entityId: id,
      details: { vendor, total: Number(total), category: category || 'ingredients' },
    })

    return NextResponse.json({ success: true, receipt })
  } catch (error: unknown) {
    console.error('Error updating receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update receipt' },
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

    // Get receipt details before deleting for activity log
    const { data: receipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single()

    // Delete associated ledger entries
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('reference_type', 'receipt')
      .eq('reference_id', id)

    // Delete the receipt
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (receipt) {
      await logActivity({
        supabase,
        userId: user.id,
        userEmail: user.email || '',
        action: 'deleted',
        entityType: 'receipt',
        entityId: id,
        details: { vendor: receipt.vendor, total: Number(receipt.total), category: receipt.category },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
