import { createClient } from '@/lib/supabase/server'
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
