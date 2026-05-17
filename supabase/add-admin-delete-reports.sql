-- =====================================================
-- ADD DELETE POLICY FOR ADMINS TO DELETE ANY REPORT
-- =====================================================

-- Policy: Admins can delete any report
CREATE POLICY "Admins can delete reports"
  ON public.service_reports FOR DELETE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'service_reports' AND cmd = 'DELETE'
ORDER BY policyname;
