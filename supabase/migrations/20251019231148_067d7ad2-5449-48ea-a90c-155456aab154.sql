-- Make price column nullable in product_colors table
ALTER TABLE public.product_colors 
ALTER COLUMN price DROP NOT NULL;