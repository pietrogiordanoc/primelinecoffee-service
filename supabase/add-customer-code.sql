-- Add customer_code column to companies table
-- This migration adds unique customer codes in format: CUS-0001, CUS-0002, etc.

-- Step 1: Add the customer_code column
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS customer_code TEXT UNIQUE;

-- Step 2: Create a sequence for generating customer codes
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

-- Step 3: Create a function to generate the next customer code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Get next sequence value
    next_number := nextval('customer_code_seq');
    
    -- Format as CUS-0001, CUS-0002, etc. (4 digits padded with zeros)
    new_code := 'CUS-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM companies WHERE customer_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
    
    -- If it exists (shouldn't happen but just in case), loop and try next number
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a trigger function that assigns customer_code on insert
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set customer_code if it's null (allow manual override if needed)
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger on companies table
DROP TRIGGER IF EXISTS trigger_set_customer_code ON public.companies;
CREATE TRIGGER trigger_set_customer_code
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_code();

-- Step 6: Backfill existing companies with customer codes
DO $$
DECLARE
  company_record RECORD;
  new_code TEXT;
BEGIN
  -- Loop through all companies without a customer_code
  FOR company_record IN 
    SELECT id FROM companies WHERE customer_code IS NULL ORDER BY created_at
  LOOP
    -- Generate code for this company
    new_code := generate_customer_code();
    
    -- Update the company
    UPDATE companies 
    SET customer_code = new_code 
    WHERE id = company_record.id;
  END LOOP;
END $$;

-- Step 7: Make customer_code NOT NULL now that all records have codes
ALTER TABLE public.companies 
ALTER COLUMN customer_code SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_customer_code ON public.companies(customer_code);

-- Add comment
COMMENT ON COLUMN public.companies.customer_code IS 'Unique customer code in format CUS-0001, CUS-0002, etc. Auto-generated on insert.';
