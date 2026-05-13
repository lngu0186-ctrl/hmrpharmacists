
-- Create public bucket for pharmacist photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pharmacist-photos',
  'pharmacist-photos',
  true,
  4194304,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public can read all photos in this bucket
CREATE POLICY "Public read pharmacist photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'pharmacist-photos');

-- Owners can upload to their own folder (path: <user_id>/...)
CREATE POLICY "Owner uploads pharmacist photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owner updates pharmacist photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owner deletes pharmacist photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pharmacist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
