import { SupabaseClient } from '@supabase/supabase-js'

interface LogActivityParams {
  supabase: SupabaseClient
  userId: string
  userEmail: string
  action: string
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function logActivity({
  supabase,
  userId,
  userEmail,
  action,
  entityType,
  entityId,
  details = {},
}: LogActivityParams) {
  try {
    await supabase.from('activity_log').insert({
      user_id: userId,
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details,
    })
  } catch (err) {
    // Never let logging failures break the main operation
    console.error('Activity log error:', err)
  }
}
