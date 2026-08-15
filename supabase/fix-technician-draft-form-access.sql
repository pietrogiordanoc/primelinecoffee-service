-- =====================================================
-- FIX: Allow technicians to view forms used in their drafts
-- Even if the form is inactive, technicians need to see it 
-- to continue editing their draft reports
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Technicians can view active forms" ON public.dynamic_forms;

-- Create new policy: Technicians can view forms if:
-- 1. The form is active, OR
-- 2. They have a report (draft or submitted) using that form
CREATE POLICY "Technicians can view forms for their reports"
  ON public.dynamic_forms FOR SELECT
  USING (
    -- Form is active (can be selected for new reports)
    is_active = true
    OR
    -- Technician has a report using this form
    EXISTS (
      SELECT 1 
      FROM public.service_reports sr
      JOIN public.technicians t ON t.id = sr.technician_id
      WHERE sr.form_id = dynamic_forms.id
        AND t.user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'dynamic_forms' 
  AND policyname = 'Technicians can view forms for their reports';

-- Test: Show which forms a technician can now access
-- (Replace with actual technician user_id to test)
/*
SELECT 
  df.id,
  df.name,
  df.is_active,
  CASE 
    WHEN df.is_active THEN 'Active'
    ELSE 'Used in tech reports'
  END as access_reason
FROM public.dynamic_forms df
WHERE 
  df.is_active = true
  OR EXISTS (
    SELECT 1 
    FROM public.service_reports sr
    JOIN public.technicians t ON t.id = sr.technician_id
    WHERE sr.form_id = df.id
      AND t.user_id = '00000000-0000-0000-0000-000000000000' -- Replace with real user_id
  )
ORDER BY df.is_active DESC, df.name;
*/
