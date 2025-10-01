-- Add shipping_cost column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0 NOT NULL;