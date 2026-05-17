-- =====================================================
-- STORAGE POLICIES FOR SERVICE-PHOTOS BUCKET
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete photos" ON storage.objects;

-- Policy: Authenticated users (technicians) can upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-photos' AND
    auth.role() = 'authenticated'
  );

-- Policy: All authenticated users can view photos
CREATE POLICY "Users can view photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-photos' AND
    auth.role() = 'authenticated'
  );

-- Policy: Admins can delete photos
CREATE POLICY "Admins can delete photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-photos' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Policy: Admins can update photos (e.g., rename)
CREATE POLICY "Admins can update photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'service-photos' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );
