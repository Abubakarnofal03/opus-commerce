-- Add color columns to order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS color_id uuid,
ADD COLUMN IF NOT EXISTS color_name text,
ADD COLUMN IF NOT EXISTS color_code text,
ADD COLUMN IF NOT EXISTS color_price numeric;