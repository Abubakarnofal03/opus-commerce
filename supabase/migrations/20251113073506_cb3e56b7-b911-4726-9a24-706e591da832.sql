-- Add banner_image field to products table for premium layout
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_image text;

-- Add index for faster queries on premium layout products
CREATE INDEX IF NOT EXISTS idx_products_premium_layout ON products(premium_layout) WHERE premium_layout = true;