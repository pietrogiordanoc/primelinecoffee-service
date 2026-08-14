-- =====================================================
-- FIX REPORT VIEWS TO INCLUDE ADMIN-CREATED REPORTS
-- Change JOIN to LEFT JOIN for technicians and users
-- to include reports with NULL technician_id
-- =====================================================

-- Update report_summary view
CREATE OR REPLACE VIEW public.report_summary AS
SELECT
  sr.id,
  sr.report_code,
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
LEFT JOIN public.technicians t ON t.id = sr.technician_id
LEFT JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id
WHERE sr.deleted_at IS NULL;  -- Exclude deleted reports

-- Update report_trash view
CREATE OR REPLACE VIEW public.report_trash AS
SELECT
  sr.id,
  sr.report_code,
  sr.status,
  sr.created_at,
  sr.submitted_at,
  sr.deleted_at,
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
LEFT JOIN public.technicians t ON t.id = sr.technician_id
LEFT JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id
WHERE sr.deleted_at IS NOT NULL  -- Only deleted reports
ORDER BY sr.deleted_at DESC;

-- Grant permissions (just in case)
GRANT SELECT ON public.report_summary TO authenticated;
GRANT SELECT ON public.report_trash TO authenticated;
