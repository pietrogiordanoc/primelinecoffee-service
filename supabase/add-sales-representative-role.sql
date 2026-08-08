-- Migration: Add Sales Representative Role
-- Description: Adds 'sales_representative' role and connects it to service reports

-- ⚠️ IMPORTANT: Execute this migration in TWO STEPS
-- PostgreSQL requires enum values to be committed before use

-- =====================================================
-- STEP 1: Add enum value (Execute this FIRST, then wait)
-- =====================================================

-- Add sales_representative to the user_role enum
ALTER TYPE user_role ADD VALUE 'sales_representative';

-- ⏸️ STOP HERE! Click RUN, wait for success, then continue to STEP 2


-- =====================================================
-- STEP 2: Add columns and policies (Execute AFTER step 1 succeeds)
-- =====================================================

-- Add sales_representative_id to service_reports table
ALTER TABLE service_reports
ADD COLUMN IF NOT EXISTS sales_representative_id UUID REFERENCES users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_reports_sales_rep ON service_reports(sales_representative_id);

-- Add comment for documentation
COMMENT ON COLUMN service_reports.sales_representative_id IS 'The sales representative who requested this service for the company';

-- Update RLS policies to allow sales reps to view their reports
CREATE POLICY "Sales reps can view their own reports"
  ON service_reports FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'sales_representative' AND
    sales_representative_id = auth.uid()
  );

-- Grant necessary permissions
GRANT SELECT ON service_reports TO authenticated;

-- Drop and recreate report_summary view to include sales representative
DROP VIEW IF EXISTS public.report_summary;

CREATE VIEW public.report_summary AS
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
