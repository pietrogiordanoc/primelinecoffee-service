-- =====================================================
-- MAKE SERVICE-PHOTOS BUCKET PUBLIC
-- =====================================================

-- Update the bucket to be public so images can be accessed without authentication
UPDATE storage.buckets
SET public = true
WHERE id = 'service-photos';

-- Verify the change
SELECT id, name, public FROM storage.buckets WHERE id = 'service-photos';
