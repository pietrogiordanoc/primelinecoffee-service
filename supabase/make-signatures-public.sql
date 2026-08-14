-- Make customer signatures publicly accessible for email viewing
-- Signatures need to be public so email clients can display them without authentication

-- Drop existing policies for signatures if any
DROP POLICY IF EXISTS "Public can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;

-- Policy: Allow public access to view signatures (for email viewing)
CREATE POLICY "Public can view signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-reports' AND
    (storage.foldername(name))[1] = 'signatures'
  );

-- Policy: Authenticated users can upload signatures
CREATE POLICY "Authenticated users can upload signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-reports' AND
    (storage.foldername(name))[1] = 'signatures' AND
    auth.role() = 'authenticated'
  );

-- Policy: Admins can delete signatures
CREATE POLICY "Admins can delete signatures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-reports' AND
    (storage.foldername(name))[1] = 'signatures' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Add comment
COMMENT ON POLICY "Public can view signatures" ON storage.objects IS 
'Allows public access to signature images so they can be displayed in emails without authentication';
