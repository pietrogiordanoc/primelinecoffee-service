-- =====================================================
-- UPDATE REPORT CODE FORMAT - Use only form code prefix
-- Change from: "CF103 - Equipment Service Report-26-001"
-- To: "CF103-26-001"
-- =====================================================

-- Step 1: Drop views that depend on report_code column
DROP VIEW IF EXISTS public.report_trash;
DROP VIEW IF EXISTS public.report_summary;

-- Step 2: Increase column size temporarily to handle long codes
ALTER TABLE public.service_reports 
ALTER COLUMN report_code TYPE VARCHAR(100);

-- Step 3: Remove NOT NULL constraint if it exists
ALTER TABLE public.service_reports 
ALTER COLUMN report_code DROP NOT NULL;

-- Step 4: Update function to extract only the code prefix (before " - ")
CREATE OR REPLACE FUNCTION generate_report_code()
RETURNS TRIGGER AS $$
DECLARE
  form_name TEXT;
  form_code TEXT;
  year_code TEXT;
  sequence_num INT;
  new_code TEXT;
BEGIN
  -- Get form name from dynamic_forms table
  SELECT name INTO form_name
  FROM public.dynamic_forms
  WHERE id = NEW.form_id;
  
  -- Extract only the code part (before " - " if exists)
  form_code := SPLIT_PART(form_name, ' - ', 1);
  
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
    AND report_code LIKE form_code || '-' || year_code || '-%';
  
  -- Generate code: CODE-YY-XXX (e.g., CF103-26-001)
  new_code := form_code || '-' || year_code || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  -- Assign the code
  NEW.report_code := new_code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update existing report codes to use short format
UPDATE public.service_reports
SET report_code = REGEXP_REPLACE(report_code, '^([A-Z0-9]+) - [^-]+-', '\1-')
WHERE report_code ~ '^[A-Z0-9]+ - ';

-- Step 6: Backfill NULL report codes
DO $$
DECLARE
  report_record RECORD;
  form_name TEXT;
  form_code TEXT;
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
    
    -- Extract code prefix
    form_code := SPLIT_PART(form_name, ' - ', 1);
    
    -- Get year from created_at
    year_code := TO_CHAR(report_record.created_at, 'YY');
    
    -- Count existing reports for this form in same year
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(report_code FROM '[0-9]+$') AS INT
      )
    ), 0) + 1
    INTO sequence_num
    FROM public.service_reports
    WHERE form_id = report_record.form_id
      AND report_code LIKE form_code || '-' || year_code || '-%';
    
    -- Generate code
    new_code := form_code || '-' || year_code || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    -- Update the report
    UPDATE public.service_reports
    SET report_code = new_code
    WHERE id = report_record.id;
    
  END LOOP;
END;
$$;

-- Step 7: Reduce column size back to optimal
ALTER TABLE public.service_reports 
ALTER COLUMN report_code TYPE VARCHAR(50);

-- Step 8: Recreate report_summary view
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
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id
WHERE sr.deleted_at IS NULL;  -- Exclude deleted reports

-- Step 9: Recreate report_trash view
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
JOIN public.technicians t ON t.id = sr.technician_id
JOIN public.users u ON u.id = t.user_id
LEFT JOIN public.users sales_rep ON sales_rep.id = sr.sales_representative_id
WHERE sr.deleted_at IS NOT NULL  -- Only deleted reports
ORDER BY sr.deleted_at DESC;

-- Step 10: Grant permissions
GRANT SELECT ON public.report_summary TO authenticated;
GRANT SELECT ON public.report_trash TO authenticated;
