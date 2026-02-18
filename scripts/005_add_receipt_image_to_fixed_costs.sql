-- Add receipt_image_url column to fixed_costs table
ALTER TABLE public.fixed_costs
ADD COLUMN IF NOT EXISTS receipt_image_url text;
