-- Migration: Add Sales Representative Role
-- Description: Adds 'sales_representative' role and connects it to service reports

-- Step 1: Add sales_representative to the user_role enum
ALTER TYPE user_role ADD VALUE 'sales_representative';

-- Step 2: Add sales_representative_id to service_reports table
ALTER TABLE service_reports
ADD COLUMN sales_representative_id UUID REFERENCES users(id);

-- Step 3: Create index for performance
CREATE INDEX idx_reports_sales_rep ON service_reports(sales_representative_id);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN service_reports.sales_representative_id IS 'The sales representative who requested this service for the company';

-- Step 5: Update RLS policies to allow sales reps to view their reports
-- Allow sales representatives to view reports they requested
CREATE POLICY "Sales reps can view their own reports"
  ON service_reports FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'sales_representative' AND
    sales_representative_id = auth.uid()
  );

-- Note: Sales representatives can only VIEW reports, not create/edit/delete them
-- Only technicians can create reports and assign them to a sales rep

-- Step 6: Grant necessary permissions
GRANT SELECT ON service_reports TO authenticated;

-- Step 7: Update report_summary view to include sales representative
CREATE OR REPLACE VIEW public.report_summary AS
SELECT
  sr.id,
  sr.status,
  sr.created_at,
  sr.submitted_at,
  df.name AS form_name,
  c.name AS company_name,
  u.full_name AS technician_name,
  u.email AS technician_email,
  sales_rep.id AS sales_rep_id,
  sales_rep.full_name AS sales_rep_name,
  sales_rep.email AS sales_rep_email,
  (SELECT COUNT(*) FROM public.report_photos WHERE report_id = sr.id) AS photo_count
FROM public.service_reports sr
JOIN public.dynamic_forms df ON df.id = sr.form_id
JOIN public.companies c ON c.id = sr.company_id
JOIN public.technicians t ON t.id = sr.technician_id
JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id;

-- Grant access to updated view
GRANT SELECT ON public.report_summary TO authenticated;
