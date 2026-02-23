import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = Number(request.nextUrl.searchParams.get('limit') || '50')

    const { data: logs, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error: unknown) {
    console.error('Error fetching activity log:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activity log' },
      { status: 500 }
    )
  }
}
