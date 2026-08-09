-- =====================================================
-- UPDATE REPORT CODE FORMAT - Use only form code prefix
-- Change from: "CF103 - Equipment Service Report-26-001"
-- To: "CF103-26-001"
-- =====================================================

-- Step 1: Increase column size temporarily to handle long codes
ALTER TABLE public.service_reports 
ALTER COLUMN report_code TYPE VARCHAR(100);

-- Step 2: Remove NOT NULL constraint if it exists
ALTER TABLE public.service_reports 
ALTER COLUMN report_code DROP NOT NULL;

-- Step 2: Update function to extract only the code prefix (before " - ")
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

-- Step 3: Update existing report codes to use short format
UPDATE public.service_reports
SET report_code = REGEXP_REPLACE(report_code, '^([A-Z0-9]+) - [^-]+-', '\1-')
WHERE report_code ~ '^[A-Z0-9]+ - ';

-- Step 4: Backfill NULL report codes
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

-- Step 5: Reduce column size back to optimal
ALTER TABLE public.service_reports 
ALTER COLUMN report_code TYPE VARCHAR(50);
