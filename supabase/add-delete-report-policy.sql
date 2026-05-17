-- =====================================================
-- ADD DELETE POLICY FOR TECHNICIANS TO DELETE THEIR OWN REPORTS
-- =====================================================

-- Policy: Technicians can delete their own reports
CREATE POLICY "Technicians can delete own reports"
  ON public.service_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.technicians t
      WHERE t.id = service_reports.technician_id
      AND t.user_id = auth.uid()
    )
  );

-- Verify policy was created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'service_reports' AND cmd = 'DELETE';
