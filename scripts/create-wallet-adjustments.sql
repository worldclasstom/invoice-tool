-- Create wallet_adjustments table for tracking manual fund adjustments
CREATE TABLE IF NOT EXISTS wallet_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cash', 'promptpay', 'credit_card')),
  type TEXT NOT NULL CHECK (type IN ('add', 'subtract')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  note TEXT DEFAULT '',
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user + date range
CREATE INDEX IF NOT EXISTS idx_wallet_adj_user_date ON wallet_adjustments(user_id, adjustment_date);

-- Enable RLS
ALTER TABLE wallet_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only manage their own adjustments
CREATE POLICY "Users can view own wallet adjustments"
  ON wallet_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet adjustments"
  ON wallet_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallet adjustments"
  ON wallet_adjustments FOR DELETE
  USING (auth.uid() = user_id);
