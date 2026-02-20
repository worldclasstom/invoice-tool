import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Pull all transfer_details from user's past reports
    const { data: reports, error } = await supabase
      .from('daily_sales')
      .select('transfer_details')
      .eq('user_id', user.id)
      .not('transfer_details', 'eq', '[]')
      .order('report_date', { ascending: false })
      .limit(100)

    if (error) throw error

    // Extract unique nickname + destination combos, keeping the most recent
    const seen = new Map<string, { nickname: string; destination: string }>()

    for (const report of reports || []) {
      const details = report.transfer_details as Array<{
        destination: string
        nickname: string
        amount: number
      }>
      if (!Array.isArray(details)) continue
      for (const d of details) {
        if (!d.nickname?.trim()) continue
        const key = d.nickname.trim().toLowerCase()
        if (!seen.has(key)) {
          seen.set(key, {
            nickname: d.nickname.trim(),
            destination: d.destination || '',
          })
        }
      }
    }

    const suggestions = Array.from(seen.values())

    return NextResponse.json({ suggestions })
  } catch (error: unknown) {
    console.error('Error fetching nickname suggestions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
