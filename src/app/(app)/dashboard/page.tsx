import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: ledgerEntries },
    { data: monthlySales },
    { data: monthlyReceipts },
    { data: monthlyFixed },
  ] = await Promise.all([
    supabase
      .from('ledger_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(50),
    supabase
      .from('daily_sales')
      .select('*')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth),
    supabase
      .from('receipts')
      .select('*')
      .gte('receipt_date', startOfMonth)
      .lte('receipt_date', endOfMonth),
    supabase
      .from('fixed_costs')
      .select('*')
      .eq('period_month', now.getMonth() + 1)
      .eq('period_year', now.getFullYear()),
  ])

  return (
    <DashboardClient
      ledgerEntries={ledgerEntries ?? []}
      monthlySales={monthlySales ?? []}
      monthlyReceipts={monthlyReceipts ?? []}
      monthlyFixed={monthlyFixed ?? []}
    />
  )
}
