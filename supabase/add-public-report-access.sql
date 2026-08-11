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

-- Allow anonymous users to view report photos
-- This is needed so photos show in the public view
CREATE POLICY "Public can view report photos"
  ON public.report_photos FOR SELECT
  USING (true);

-- Allow anonymous users to view companies (for report details)
CREATE POLICY "Public can view companies"
  ON public.companies FOR SELECT
  USING (true);

-- Allow anonymous users to view forms (for report details)
CREATE POLICY "Public can view forms"
  ON public.dynamic_forms FOR SELECT
  USING (true);

-- Allow anonymous users to view technicians (for report details)
CREATE POLICY "Public can view technicians"
  ON public.technicians FOR SELECT
  USING (true);

-- Allow anonymous users to view users (for technician names)
CREATE POLICY "Public can view users"
  ON public.users FOR SELECT
  USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('service_reports', 'report_photos', 'companies', 'dynamic_forms', 'technicians', 'users')
ORDER BY tablename, policyname;
