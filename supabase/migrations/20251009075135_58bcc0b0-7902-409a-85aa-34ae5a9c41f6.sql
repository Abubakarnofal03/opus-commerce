-- Add order_number column to orders table
ALTER TABLE public.orders 
ADD COLUMN order_number SERIAL;

-- Update existing orders with sequential numbers based on creation date
WITH numbered_orders AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM public.orders
)
UPDATE public.orders
SET order_number = numbered_orders.new_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

-- Make order_number NOT NULL and UNIQUE after populating existing data
ALTER TABLE public.orders 
ALTER COLUMN order_number SET NOT NULL;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);

-- Create index for faster lookups
CREATE INDEX idx_orders_order_number ON public.orders(order_number);