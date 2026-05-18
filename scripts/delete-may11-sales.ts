import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteMay11Sales() {
  const date = '2025-05-11'
  
  console.log(`Looking for sales record on ${date}...`)
  
  // First get the sale to find its ID
  const { data: sale, error: fetchError } = await supabase
    .from('daily_sales')
    .select('id, total_amount, report_date')
    .eq('report_date', date)
    .maybeSingle()
    
  if (fetchError) {
    console.error('Error fetching sale:', fetchError)
    process.exit(1)
  }
  
  if (!sale) {
    console.log('No sales record found for May 11, 2025')
    process.exit(0)
  }
  
  console.log('Found sale:', sale)
  
  // Delete associated ledger entries
  const { error: ledgerError } = await supabase
    .from('ledger_entries')
    .delete()
    .eq('reference_type', 'daily_sales')
    .eq('reference_id', sale.id)
    
  if (ledgerError) {
    console.error('Error deleting ledger entries:', ledgerError)
  } else {
    console.log('Deleted associated ledger entries')
  }
  
  // Delete the sales record
  const { error: deleteError } = await supabase
    .from('daily_sales')
    .delete()
    .eq('report_date', date)
    
  if (deleteError) {
    console.error('Error deleting sale:', deleteError)
    process.exit(1)
  }
  
  console.log('Successfully deleted May 11, 2025 sales record')
}

deleteMay11Sales()
