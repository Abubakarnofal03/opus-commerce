-- Add user_id column to track who submitted the review
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policy: Only show verified reviews to public
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view approved reviews" 
ON reviews FOR SELECT 
USING (is_verified = true);

-- New policy: Authenticated users can submit their own reviews
CREATE POLICY "Authenticated users can submit reviews" 
ON reviews FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_verified = false);