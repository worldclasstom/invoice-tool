import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const platform = searchParams.get('platform') // optional filter
  const periodType = searchParams.get('period_type') // optional filter

  let query = supabase
    .from('ad_costs')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (from) query = query.gte('start_date', from)
  if (to) query = query.lte('end_date', to)
  if (platform) query = query.eq('platform', platform)
  if (periodType) query = query.eq('period_type', periodType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build summary aggregations
  const entries = data ?? []
  const totalSpend = entries.reduce((s, e) => s + Number(e.amount), 0)
  const byPlatform: Record<string, number> = {}
  const byPeriod: Record<string, number> = {}
  for (const e of entries) {
    byPlatform[e.platform] = (byPlatform[e.platform] || 0) + Number(e.amount)
    byPeriod[e.period_type] = (byPeriod[e.period_type] || 0) + Number(e.amount)
  }

  return NextResponse.json({
    entries,
    summary: { totalSpend, byPlatform, byPeriod, count: entries.length },
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { platform, period_type, start_date, end_date, amount, note } = body

  if (!platform || !period_type || !start_date || !end_date || amount == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ad_costs')
    .insert({
      user_id: user.id,
      platform,
      period_type,
      start_date,
      end_date,
      amount: Number(amount),
      note: note || '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Only allow updating own records
  const { data, error } = await supabase
    .from('ad_costs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('ad_costs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
