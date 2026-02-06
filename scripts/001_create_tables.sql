-- ============================================
-- Madre Tools - Database Schema
-- ============================================

-- 1. Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  date timestamptz not null default now(),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  status text not null default 'draft',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;
create policy "invoices_select" on public.invoices for select using (auth.uid() = user_id);
create policy "invoices_insert" on public.invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update" on public.invoices for update using (auth.uid() = user_id);
create policy "invoices_delete" on public.invoices for delete using (auth.uid() = user_id);

-- 2. Invoice Line Items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoice_line_items enable row level security;
create policy "line_items_select" on public.invoice_line_items for select using (
  exists (select 1 from public.invoices where id = invoice_id and user_id = auth.uid())
);
create policy "line_items_insert" on public.invoice_line_items for insert with check (
  exists (select 1 from public.invoices where id = invoice_id and user_id = auth.uid())
);
create policy "line_items_update" on public.invoice_line_items for update using (
  exists (select 1 from public.invoices where id = invoice_id and user_id = auth.uid())
);
create policy "line_items_delete" on public.invoice_line_items for delete using (
  exists (select 1 from public.invoices where id = invoice_id and user_id = auth.uid())
);

-- 3. Daily Sales Reports
create table if not exists public.daily_sales (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  cash_amount numeric(12,2) not null default 0,
  promptpay_amount numeric(12,2) not null default 0,
  credit_card_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  tables_served integer not null default 0,
  togo_orders integer not null default 0,
  weather text,
  busiest_times text[] default '{}',
  pos_image_url text,
  transfer_details jsonb default '[]',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_date, user_id)
);

alter table public.daily_sales enable row level security;
create policy "daily_sales_select" on public.daily_sales for select using (auth.uid() = user_id);
create policy "daily_sales_insert" on public.daily_sales for insert with check (auth.uid() = user_id);
create policy "daily_sales_update" on public.daily_sales for update using (auth.uid() = user_id);
create policy "daily_sales_delete" on public.daily_sales for delete using (auth.uid() = user_id);

-- 4. Receipts / Expense Tracker (for ingredients, supplies, etc.)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_date date not null,
  vendor text not null,
  total numeric(12,2) not null default 0,
  category text not null default 'ingredients',
  notes text,
  image_url text,
  is_manual boolean not null default false,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.receipts enable row level security;
create policy "receipts_select" on public.receipts for select using (auth.uid() = user_id);
create policy "receipts_insert" on public.receipts for insert with check (auth.uid() = user_id);
create policy "receipts_update" on public.receipts for update using (auth.uid() = user_id);
create policy "receipts_delete" on public.receipts for delete using (auth.uid() = user_id);

-- 5. Fixed Costs
create table if not exists public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  amount numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  due_day integer,
  is_paid boolean not null default false,
  paid_date date,
  period_month integer not null,
  period_year integer not null,
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fixed_costs enable row level security;
create policy "fixed_costs_select" on public.fixed_costs for select using (auth.uid() = user_id);
create policy "fixed_costs_insert" on public.fixed_costs for insert with check (auth.uid() = user_id);
create policy "fixed_costs_update" on public.fixed_costs for update using (auth.uid() = user_id);
create policy "fixed_costs_delete" on public.fixed_costs for delete using (auth.uid() = user_id);

-- 6. General Ledger / Journal
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  description text not null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null,
  amount numeric(12,2) not null default 0,
  payment_method text,
  reference_type text,
  reference_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ledger_entries enable row level security;
create policy "ledger_select" on public.ledger_entries for select using (auth.uid() = user_id);
create policy "ledger_insert" on public.ledger_entries for insert with check (auth.uid() = user_id);
create policy "ledger_update" on public.ledger_entries for update using (auth.uid() = user_id);
create policy "ledger_delete" on public.ledger_entries for delete using (auth.uid() = user_id);

-- 7. Storage bucket for receipts and POS images
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;

create policy "uploads_select" on storage.objects for select using (bucket_id = 'uploads');
create policy "uploads_insert" on storage.objects for insert with check (bucket_id = 'uploads' and auth.role() = 'authenticated');
create policy "uploads_delete" on storage.objects for delete using (bucket_id = 'uploads' and auth.uid() = owner);
