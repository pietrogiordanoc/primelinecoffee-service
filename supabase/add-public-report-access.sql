-- =====================================================
-- ADD PUBLIC READ ACCESS TO SERVICE REPORTS
-- This allows the /report-photos/:id public link to work
-- in incognito mode and when shared externally
-- =====================================================

-- Allow anonymous (not authenticated) users to view any service report
-- This is needed for the public sharing link functionality
CREATE POLICY "Public can view service reports"
  ON public.service_reports FOR SELECT
  USING (true);

-- Allow anonymous users to view photos of any report
-- This is needed so photos show in the public view
CREATE POLICY "Public can view report photos"
  ON public.report_photos FOR SELECT
  USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('service_reports', 'report_photos')
ORDER BY tablename, policyname;
