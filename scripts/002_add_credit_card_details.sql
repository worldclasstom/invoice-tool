-- Add credit_card_details jsonb column to daily_sales
alter table public.daily_sales
  add column if not exists credit_card_details jsonb default '[]';
