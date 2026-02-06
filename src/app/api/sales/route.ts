import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      reportDate,
      cashAmount,
      promptpayAmount,
      creditCardAmount,
      tablesServed,
      togoOrders,
      weather,
      busiestTimes,
      posImageUrl,
      transferDetails,
    } = body

    const totalAmount =
      Number(cashAmount || 0) +
      Number(promptpayAmount || 0) +
      Number(creditCardAmount || 0)

    // Upsert daily sales (one per date per user)
    const { data: sale, error: saleError } = await supabase
      .from('daily_sales')
      .upsert(
        {
          report_date: reportDate,
          cash_amount: cashAmount || 0,
          promptpay_amount: promptpayAmount || 0,
          credit_card_amount: creditCardAmount || 0,
          total_amount: totalAmount,
          tables_served: tablesServed || 0,
          togo_orders: togoOrders || 0,
          weather: weather || null,
          busiest_times: busiestTimes || [],
          pos_image_url: posImageUrl || null,
          transfer_details: transferDetails || [],
          user_id: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'report_date,user_id' }
      )
      .select()
      .single()

    if (saleError) throw saleError

    // Delete existing ledger entry for this sale, then create new one
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('reference_type', 'daily_sales')
      .eq('reference_id', sale.id)

    await supabase.from('ledger_entries').insert({
      entry_date: reportDate,
      description: `Daily sales - ${reportDate}`,
      entry_type: 'income',
      category: 'sales',
      amount: totalAmount,
      payment_method: 'mixed',
      reference_type: 'daily_sales',
      reference_id: sale.id,
      user_id: user.id,
    })

    return NextResponse.json({ success: true, sale })
  } catch (error: unknown) {
    console.error('Error saving sales report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save sales report' },
      { status: 500 }
    )
  }
}
