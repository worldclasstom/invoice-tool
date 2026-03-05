-- ============================================
-- Fixed Cost Reminders Table
-- Tracks 6 recurring monthly costs with due dates
-- ============================================

CREATE TABLE IF NOT EXISTS public.fixed_cost_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_type TEXT NOT NULL CHECK (cost_type IN (
    'WATER', 'ELECTRICITY', 'CREDIT_CARD_UOB', 'INTERNET',
    'EMPLOYEE_FIRST_HALF', 'EMPLOYEE_SECOND_HALF'
  )),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2026),
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cost_type, period_month, period_year, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fcr_user_unpaid
  ON public.fixed_cost_reminders (user_id, paid, due_date);
CREATE INDEX IF NOT EXISTS idx_fcr_period
  ON public.fixed_cost_reminders (user_id, period_year, period_month);

-- Enable RLS
ALTER TABLE public.fixed_cost_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcr_select" ON public.fixed_cost_reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fcr_insert" ON public.fixed_cost_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fcr_update" ON public.fixed_cost_reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fcr_delete" ON public.fixed_cost_reminders
  FOR DELETE USING (auth.uid() = user_id);
