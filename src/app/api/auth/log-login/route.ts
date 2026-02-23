import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/activity-log'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await logActivity({
      supabase,
      userId: user.id,
      userEmail: user.email || '',
      action: 'logged_in',
      entityType: 'auth',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}
