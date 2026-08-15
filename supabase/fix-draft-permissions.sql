-- =====================================================
-- FIX DRAFT PERMISSIONS FOR TECHNICIANS AND ADMINS
-- Allow technicians to view, update, and delete their own drafts
-- Allow admins to delete any report
-- =====================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Technicians can view own reports" ON public.service_reports;
DROP POLICY IF EXISTS "Technicians can update own draft reports" ON public.service_reports;
DROP POLICY IF EXISTS "Technicians can delete own reports" ON public.service_reports;
DROP POLICY IF EXISTS "Technicians can delete own draft reports" ON public.service_reports;
DROP POLICY IF EXISTS "Admins can delete any report" ON public.service_reports;

-- Technicians can view ALL their own reports (drafts and submitted)
CREATE POLICY "Technicians can view own reports"
  ON public.service_reports FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

-- Technicians can update their own DRAFT reports only
CREATE POLICY "Technicians can update own draft reports"
  ON public.service_reports FOR UPDATE
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  )
  WITH CHECK (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Technicians can delete their own DRAFT reports only
CREATE POLICY "Technicians can delete own draft reports"
  ON public.service_reports FOR DELETE
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Admins can delete ANY report (drafts or submitted)
CREATE POLICY "Admins can delete any report"
  ON public.service_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Verify the policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'service_reports' 
  AND policyname LIKE '%delete%'
ORDER BY cmd, policyname;
