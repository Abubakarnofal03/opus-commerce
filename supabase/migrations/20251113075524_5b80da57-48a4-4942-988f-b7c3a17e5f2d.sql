-- Change banner_image from text to text array to support multiple banners
ALTER TABLE products 
ALTER COLUMN banner_image TYPE text[] 
USING CASE 
  WHEN banner_image IS NULL THEN NULL
  WHEN banner_image = '' THEN NULL
  ELSE ARRAY[banner_image]
END;

-- Update the column default
ALTER TABLE products 
ALTER COLUMN banner_image SET DEFAULT '{}'::text[];