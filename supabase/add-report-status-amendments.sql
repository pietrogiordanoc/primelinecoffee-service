-- =====================================================
-- ADD REPORT STATUS AND AMENDMENTS SYSTEM
-- Allow technicians to save drafts and amend submitted reports
-- =====================================================

-- Step 1: Add status column to service_reports
DO $$ 
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'voided');
  END IF;
END $$;

-- Add status column (default 'submitted' for existing reports)
ALTER TABLE public.service_reports 
ADD COLUMN IF NOT EXISTS status report_status DEFAULT 'submitted';

-- Add amendment_count column
ALTER TABLE public.service_reports
ADD COLUMN IF NOT EXISTS amendment_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.service_reports.status 
IS 'Report status: draft (work in progress), submitted (completed), voided (invalidated)';

COMMENT ON COLUMN public.service_reports.amendment_count 
IS 'Number of amendments made to this report';

-- Step 2: Create report_amendments table
CREATE TABLE IF NOT EXISTS public.report_amendments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_report_id UUID NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  amendment_type TEXT NOT NULL CHECK (amendment_type IN ('update', 'void')),
  reason TEXT NOT NULL,
  amended_by UUID NOT NULL REFERENCES public.users(id),
  amended_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_amendment_type CHECK (amendment_type IN ('update', 'void'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_report_amendments_original_report 
ON public.report_amendments(original_report_id);

CREATE INDEX IF NOT EXISTS idx_report_amendments_created_at 
ON public.report_amendments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_reports_status 
ON public.service_reports(status);

-- Add RLS policies for report_amendments
ALTER TABLE public.report_amendments ENABLE ROW LEVEL SECURITY;

-- Admins can view all amendments
CREATE POLICY "Admins can view all amendments"
ON public.report_amendments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('super_admin', 'admin')
  )
);

-- Technicians can view amendments for their own reports
CREATE POLICY "Technicians can view own report amendments"
ON public.report_amendments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_reports sr
    JOIN public.technicians t ON t.id = sr.technician_id
    WHERE sr.id = report_amendments.original_report_id
    AND t.user_id = auth.uid()
  )
);

-- Technicians can insert amendments for their own submitted reports
CREATE POLICY "Technicians can create amendments for own reports"
ON public.report_amendments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_reports sr
    JOIN public.technicians t ON t.id = sr.technician_id
    WHERE sr.id = original_report_id
    AND t.user_id = auth.uid()
    AND sr.status = 'submitted'
  )
);

-- Add comments
COMMENT ON TABLE public.report_amendments 
IS 'Amendments made to submitted reports (corrections or voids)';

-- Step 3: Update report_summary view to include status and amendment_count
DROP VIEW IF EXISTS public.report_summary CASCADE;

CREATE VIEW public.report_summary AS
SELECT
  sr.id,
  sr.report_code,
  sr.status,
  sr.amendment_count,
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
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id;

-- Grant access to the view
GRANT SELECT ON public.report_summary TO authenticated;

-- Verify changes
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_reports'
  AND column_name IN ('status', 'amendment_count');

SELECT COUNT(*) as amendment_table_exists 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'report_amendments';
