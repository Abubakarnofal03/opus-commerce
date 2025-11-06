-- Add sort_order column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Create an index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);

-- Initialize sort_order values based on created_at (older products get higher numbers)
UPDATE products 
SET sort_order = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num 
  FROM products
) AS subquery 
WHERE products.id = subquery.id;