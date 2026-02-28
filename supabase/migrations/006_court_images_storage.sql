-- Create court-images storage bucket (public, 5MB limit, jpeg/png/webp)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'court-images',
  'court-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read court images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'court-images');

-- Tenant owners can upload court images
CREATE POLICY "Tenant owners can upload court images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'court-images'
    AND EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = (storage.foldername(name))[1]::uuid
        AND tenants.owner_id = auth.uid()
    )
  );

-- Tenant owners can update court images
CREATE POLICY "Tenant owners can update court images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'court-images'
    AND EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = (storage.foldername(name))[1]::uuid
        AND tenants.owner_id = auth.uid()
    )
  );

-- Tenant owners can delete court images
CREATE POLICY "Tenant owners can delete court images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'court-images'
    AND EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.id = (storage.foldername(name))[1]::uuid
        AND tenants.owner_id = auth.uid()
    )
  );
