-- =====================================================
-- UPDATE REPORT CODE FORMAT - Use only form code prefix
-- Change from: "CF103 - Equipment Service Report-26-001"
-- To: "CF103-26-001"
-- =====================================================

-- Update function to extract only the code prefix (before " - ")
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

-- Update existing report codes to use short format
UPDATE public.service_reports
SET report_code = SPLIT_PART(report_code, ' - ', 1) || SUBSTRING(report_code FROM ' - [0-9].*')
WHERE report_code LIKE '%Equipment Service Report%';

-- More general update for any report with " - " in the code
UPDATE public.service_reports
SET report_code = REGEXP_REPLACE(report_code, '^([A-Z0-9]+) - [^-]+-', '\1-')
WHERE report_code ~ '^[A-Z0-9]+ - ';
