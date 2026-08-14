-- Check existing DELETE policies on service_reports
SELECT 
  policyname, 
  cmd,
  qual as "using_expression"
FROM pg_policies
WHERE tablename = 'service_reports' 
  AND cmd = 'DELETE'
ORDER BY policyname;
