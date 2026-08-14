-- =====================================================
-- DIAGNOSE ADMIN REPORTS ISSUE
-- Check if reports exist and if they appear in view
-- =====================================================

-- 1. Check all service reports (including those with NULL technician_id)
SELECT 
  id, 
  report_code, 
  technician_id, 
  company_id,
  created_at,
  deleted_at
FROM public.service_reports
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check what the report_summary view returns
SELECT * 
FROM public.report_summary 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count reports by technician_id (should show NULL for admin reports)
SELECT 
  CASE 
    WHEN technician_id IS NULL THEN 'Admin Reports (NULL)'
    ELSE 'Technician Reports'
  END as report_type,
  COUNT(*) as count
FROM public.service_reports
WHERE deleted_at IS NULL
GROUP BY technician_id IS NULL;

-- 4. Check RLS policies on report_summary view
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'service_reports';
