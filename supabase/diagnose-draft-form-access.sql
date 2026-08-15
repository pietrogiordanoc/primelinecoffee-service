-- =====================================================
-- DIAGNOSE: Why can't technician access form for draft?
-- Run this while logged in as the technician having issues
-- =====================================================

-- Step 1: Check current user
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- Step 2: Get technician ID for current user
SELECT 
  t.id as technician_id,
  t.user_id,
  u.full_name as technician_name,
  t.can_view_all_reports
FROM public.technicians t
LEFT JOIN public.users u ON u.id = t.user_id
WHERE t.user_id = auth.uid();

-- Step 3: Show ALL draft reports for this technician
SELECT 
  sr.id as report_id,
  sr.form_id,
  sr.status,
  sr.created_at,
  sr.company_id,
  c.name as company_name
FROM public.service_reports sr
LEFT JOIN public.companies c ON c.id = sr.company_id
WHERE sr.technician_id IN (
  SELECT id FROM public.technicians WHERE user_id = auth.uid()
)
AND sr.status = 'draft'
ORDER BY sr.created_at DESC;

-- Step 4: For each draft, check if the form exists and is accessible
-- Replace 'PASTE_REPORT_ID_HERE' with actual report ID from step 3
/*
SELECT 
  sr.id as report_id,
  sr.form_id,
  df.id as form_exists,
  df.name as form_name,
  df.is_active as form_is_active,
  CASE 
    WHEN df.id IS NULL THEN '❌ Form does not exist in database'
    WHEN df.id IS NOT NULL THEN '✅ Form exists and is accessible by this user'
  END as access_status
FROM public.service_reports sr
LEFT JOIN public.dynamic_forms df ON df.id = sr.form_id
WHERE sr.id = 'PASTE_REPORT_ID_HERE';
*/

-- Step 5: Check ALL policies on dynamic_forms table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'dynamic_forms'
ORDER BY policyname;

-- Step 6: Test the policy logic manually for a specific form_id
-- Replace 'PASTE_FORM_ID_HERE' with the form_id from step 3
/*
SELECT 
  df.id,
  df.name,
  df.is_active,
  -- Check condition 1: is_active = true
  (df.is_active = true) as condition1_active_form,
  -- Check condition 2: technician has report with this form
  EXISTS (
    SELECT 1 
    FROM public.service_reports sr
    JOIN public.technicians t ON t.id = sr.technician_id
    WHERE sr.form_id = df.id
      AND t.user_id = auth.uid()
  ) as condition2_has_report,
  -- Final result (should be true if either condition is true)
  (
    df.is_active = true
    OR EXISTS (
      SELECT 1 
      FROM public.service_reports sr
      JOIN public.technicians t ON t.id = sr.technician_id
      WHERE sr.form_id = df.id
        AND t.user_id = auth.uid()
    )
  ) as should_have_access
FROM public.dynamic_forms df
WHERE df.id = 'PASTE_FORM_ID_HERE';
*/
