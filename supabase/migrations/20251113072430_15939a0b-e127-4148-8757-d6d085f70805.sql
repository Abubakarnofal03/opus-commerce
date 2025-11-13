-- Add premium_layout field to products table
ALTER TABLE products ADD COLUMN premium_layout BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX idx_products_premium_layout ON products(premium_layout) WHERE premium_layout = true;