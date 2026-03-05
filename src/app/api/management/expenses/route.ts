import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get('month'))
    const year = Number(searchParams.get('year'))

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 })
    }

    // Date range for the selected month
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Revenue from daily_sales grouped by payment method
    const { data: sales, error: salesErr } = await supabase
      .from('daily_sales')
      .select('cash_amount, promptpay_amount, credit_card_amount, total_amount')
      .gte('report_date', from)
      .lte('report_date', to)

    if (salesErr) throw salesErr

    const revenue = { cash: 0, promptpay: 0, credit_card: 0, total: 0 }
    for (const s of (sales ?? [])) {
      revenue.cash += Number(s.cash_amount) || 0
      revenue.promptpay += Number(s.promptpay_amount) || 0
      revenue.credit_card += Number(s.credit_card_amount) || 0
      revenue.total += Number(s.total_amount) || 0
    }

    // Expense: Receipts
    const { data: receipts, error: recErr } = await supabase
      .from('receipts')
      .select('total, category')
      .gte('receipt_date', from)
      .lte('receipt_date', to)

    if (recErr) throw recErr

    const receiptsByCategory: Record<string, number> = {}
    let receiptTotal = 0
    for (const r of (receipts ?? [])) {
      const cat = r.category || 'other'
      const amt = Number(r.total) || 0
      receiptsByCategory[cat] = (receiptsByCategory[cat] || 0) + amt
      receiptTotal += amt
    }

    // Expense: Fixed costs
    const { data: fixedCosts, error: fixedErr } = await supabase
      .from('fixed_costs')
      .select('amount, category, is_paid')
      .eq('period_month', month)
      .eq('period_year', year)

    if (fixedErr) throw fixedErr

    const fixedByCategory: Record<string, number> = {}
    let fixedTotal = 0
    for (const f of (fixedCosts ?? [])) {
      const cat = f.category || 'other'
      const amt = Number(f.amount) || 0
      fixedByCategory[cat] = (fixedByCategory[cat] || 0) + amt
      fixedTotal += amt
    }

    // Expense: Ad costs
    const { data: adCosts, error: adErr } = await supabase
      .from('ad_costs')
      .select('amount, platform')
      .gte('start_date', from)
      .lte('end_date', to)

    if (adErr) throw adErr

    const adByPlatform: Record<string, number> = {}
    let adTotal = 0
    for (const a of (adCosts ?? [])) {
      const plat = a.platform || 'other'
      const amt = Number(a.amount) || 0
      adByPlatform[plat] = (adByPlatform[plat] || 0) + amt
      adTotal += amt
    }

    const totalExpenses = receiptTotal + fixedTotal + adTotal

    // Wallet adjustments for this month
    const { data: adjustments, error: adjErr } = await supabase
      .from('wallet_adjustments')
      .select('*')
      .gte('adjustment_date', from)
      .lte('adjustment_date', to)
      .order('created_at', { ascending: false })

    if (adjErr) throw adjErr

    // Compute wallet balances per method: revenue + adds - subtracts - expenses (distributed by revenue ratio)
    const walletAdjustments = { cash: 0, promptpay: 0, credit_card: 0 }
    for (const adj of (adjustments ?? [])) {
      const amt = Number(adj.amount) || 0
      const method = adj.method as keyof typeof walletAdjustments
      if (method in walletAdjustments) {
        walletAdjustments[method] += adj.type === 'add' ? amt : -amt
      }
    }

    const wallet = {
      cash: revenue.cash + walletAdjustments.cash,
      promptpay: revenue.promptpay + walletAdjustments.promptpay,
      credit_card: revenue.credit_card + walletAdjustments.credit_card,
      total: revenue.total + walletAdjustments.cash + walletAdjustments.promptpay + walletAdjustments.credit_card,
    }

    return NextResponse.json({
      month,
      year,
      revenue,
      wallet,
      adjustments: adjustments ?? [],
      expenses: {
        total: totalExpenses,
        receipts: { total: receiptTotal, byCategory: receiptsByCategory },
        fixedCosts: { total: fixedTotal, byCategory: fixedByCategory },
        adCosts: { total: adTotal, byPlatform: adByPlatform },
      },
      netProfit: revenue.total - totalExpenses,
    })
  } catch (error: unknown) {
    console.error('Error fetching expense management data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { method, type, amount, note, adjustment_date } = body

    if (!method || !type || !amount || !adjustment_date) {
      return NextResponse.json({ error: 'method, type, amount, and adjustment_date are required' }, { status: 400 })
    }

    if (!['cash', 'promptpay', 'credit_card'].includes(method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
    }
    if (!['add', 'subtract'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    const { data: adjustment, error } = await supabase
      .from('wallet_adjustments')
      .insert({
        user_id: user.id,
        method,
        type,
        amount: Number(amount),
        note: note || '',
        adjustment_date,
      })
      .select()
      .single()

    if (error) throw error

    const methodLabels: Record<string, string> = { cash: 'Cash', promptpay: 'PromptPay', credit_card: 'Credit Card' }
    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: type === 'add' ? 'added_funds' : 'subtracted_funds',
      entityType: 'wallet_adjustment',
      entityId: adjustment.id,
      details: {
        method: methodLabels[method] || method,
        amount: Number(amount),
        note: note || '',
        date: adjustment_date,
      },
    })

    return NextResponse.json({ success: true, adjustment })
  } catch (error: unknown) {
    console.error('Error creating wallet adjustment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create adjustment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('wallet_adjustments')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'deleted',
      entityType: 'wallet_adjustment',
      entityId: id,
      details: {},
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting wallet adjustment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete adjustment' },
      { status: 500 }
    )
  }
}
