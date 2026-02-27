-- Create ad_costs table for tracking ad spending across platforms
CREATE TABLE IF NOT EXISTS ad_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'instagram')),
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient queries by user and date
CREATE INDEX IF NOT EXISTS idx_ad_costs_user_dates ON ad_costs (user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_costs_platform ON ad_costs (user_id, platform);

-- Enable RLS
ALTER TABLE ad_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own ad costs" ON ad_costs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad costs" ON ad_costs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad costs" ON ad_costs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad costs" ON ad_costs
  FOR DELETE USING (auth.uid() = user_id);
