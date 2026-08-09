-- =====================================================
-- ADD REPORT CODE COLUMN AND AUTO-GENERATION
-- Format: {FORM_NAME}-{YY}-{SEQ}
-- Example: CF103-26-001
-- =====================================================

-- Add report_code column
ALTER TABLE public.service_reports 
ADD COLUMN report_code VARCHAR(20) UNIQUE;

-- Create function to generate report code
CREATE OR REPLACE FUNCTION generate_report_code()
RETURNS TRIGGER AS $$
DECLARE
  form_name TEXT;
  year_code TEXT;
  sequence_num INT;
  new_code TEXT;
BEGIN
  -- Get form name from dynamic_forms table
  SELECT name INTO form_name
  FROM public.dynamic_forms
  WHERE id = NEW.form_id;
  
  -- Get last 2 digits of current year
  year_code := TO_CHAR(NOW(), 'YY');
  
  -- Count existing reports for this form in current year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(report_code FROM '[0-9]+$') AS INT
    )
  ), 0) + 1
  INTO sequence_num
  FROM public.service_reports
  WHERE form_id = NEW.form_id
    AND report_code LIKE form_name || '-' || year_code || '-%';
  
  -- Generate code: FORMNAME-YY-XXX
  new_code := form_name || '-' || year_code || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  -- Assign the code
  NEW.report_code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate report code on insert
DROP TRIGGER IF EXISTS trigger_generate_report_code ON public.service_reports;
CREATE TRIGGER trigger_generate_report_code
  BEFORE INSERT ON public.service_reports
  FOR EACH ROW
  EXECUTE FUNCTION generate_report_code();

-- Backfill existing reports with codes
DO $$
DECLARE
  report_record RECORD;
  form_name TEXT;
  year_code TEXT;
  sequence_num INT;
  new_code TEXT;
BEGIN
  FOR report_record IN 
    SELECT id, form_id, created_at 
    FROM public.service_reports 
    WHERE report_code IS NULL
    ORDER BY created_at
  LOOP
    -- Get form name
    SELECT name INTO form_name
    FROM public.dynamic_forms
    WHERE id = report_record.form_id;
    
    -- Get year from created_at
    year_code := TO_CHAR(report_record.created_at, 'YY');
    
    -- Count existing reports for this form in same year
    SELECT COUNT(*) + 1
    INTO sequence_num
    FROM public.service_reports
    WHERE form_id = report_record.form_id
      AND report_code IS NOT NULL
      AND report_code LIKE form_name || '-' || year_code || '-%'
      AND created_at < report_record.created_at;
    
    -- Generate code
    new_code := form_name || '-' || year_code || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    -- Update report
    UPDATE public.service_reports
    SET report_code = new_code
    WHERE id = report_record.id;
  END LOOP;
END $$;

-- Make report_code NOT NULL after backfill
ALTER TABLE public.service_reports 
ALTER COLUMN report_code SET NOT NULL;

-- Update report_summary view to include report_code
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
JOIN public.technicians t ON t.id = sr.technician_id
JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id;
