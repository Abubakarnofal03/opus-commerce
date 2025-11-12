-- Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow anyone to view review images (bucket is public)
CREATE POLICY "Anyone can view review images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow users to update their own review images
CREATE POLICY "Users can update review images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);

-- Allow users to delete review images
CREATE POLICY "Users can delete review images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-images' 
  AND (storage.foldername(name))[1] = 'reviews'
);