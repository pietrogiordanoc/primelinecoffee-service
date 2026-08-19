-- Add branch/location support and fuzzy matching for duplicate detection
-- This migration enables multi-location customers and duplicate detection

-- Step 1: Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Add columns for branch/location support
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS branch_name TEXT,
ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT false;

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_parent_company_id ON public.companies(parent_company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON public.companies USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_is_branch ON public.companies(is_branch);

-- Step 4: Create function to check for duplicate customers
-- Returns potential duplicates based on name, city, and phone similarity
CREATE OR REPLACE FUNCTION check_duplicate_customers(
  p_name TEXT,
  p_city TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  customer_code TEXT,
  name TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  similarity_score NUMERIC,
  match_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.customer_code,
    c.name,
    c.city,
    c.state,
    c.address,
    c.contact_phone,
    c.contact_name,
    GREATEST(
      similarity(LOWER(c.name), LOWER(p_name)),
      CASE 
        WHEN p_city IS NOT NULL AND c.city IS NOT NULL 
        THEN similarity(LOWER(c.city), LOWER(p_city)) * 0.3 
        ELSE 0 
      END
    ) AS similarity_score,
    CASE
      WHEN LOWER(c.name) = LOWER(p_name) AND LOWER(COALESCE(c.city, '')) = LOWER(COALESCE(p_city, '')) 
        THEN 'Exact name + city match'
      WHEN LOWER(c.name) = LOWER(p_name) 
        THEN 'Exact name match'
      WHEN similarity(LOWER(c.name), LOWER(p_name)) > 0.8 AND p_phone IS NOT NULL AND c.contact_phone = p_phone
        THEN 'Similar name + same phone'
      WHEN similarity(LOWER(c.name), LOWER(p_name)) > 0.8 AND p_city IS NOT NULL AND LOWER(COALESCE(c.city, '')) = LOWER(COALESCE(p_city, ''))
        THEN 'Similar name + same city'
      WHEN similarity(LOWER(c.name), LOWER(p_name)) > 0.7
        THEN 'Similar name'
      ELSE 'Possible match'
    END AS match_reason
  FROM companies c
  WHERE 
    c.is_active = true
    AND (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND c.parent_company_id IS NULL  -- Only match against parent companies, not branches
    AND (
      -- Exact name match (case-insensitive)
      LOWER(c.name) = LOWER(p_name)
      OR
      -- High similarity name (>70%)
      similarity(LOWER(c.name), LOWER(p_name)) > 0.7
      OR
      -- Same phone number (if provided)
      (p_phone IS NOT NULL AND c.contact_phone = p_phone)
    )
  ORDER BY similarity_score DESC, c.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to get all branches of a company
CREATE OR REPLACE FUNCTION get_company_branches(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  customer_code TEXT,
  branch_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.customer_code,
    c.branch_name,
    c.address,
    c.city,
    c.state,
    c.contact_name,
    c.contact_phone,
    c.created_at
  FROM companies c
  WHERE 
    c.parent_company_id = p_company_id
    AND c.is_active = true
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to get company with all its branches
CREATE OR REPLACE FUNCTION get_company_with_branches(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'company', row_to_json(c.*),
    'branches', (
      SELECT COALESCE(json_agg(b.*), '[]'::json)
      FROM get_company_branches(p_company_id) b
    )
  ) INTO result
  FROM companies c
  WHERE c.id = p_company_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add constraint to ensure branch_name is required when is_branch is true
-- Drop existing constraint if it exists, then recreate it
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS check_branch_name;

ALTER TABLE public.companies
ADD CONSTRAINT check_branch_name 
CHECK (
  (is_branch = false AND branch_name IS NULL) 
  OR 
  (is_branch = true AND branch_name IS NOT NULL AND parent_company_id IS NOT NULL)
);

-- Step 8: Add comments
COMMENT ON COLUMN public.companies.parent_company_id IS 'Reference to parent company if this is a branch/location';
COMMENT ON COLUMN public.companies.branch_name IS 'Branch/location name (e.g., "Downtown", "Airport", "Mall Location")';
COMMENT ON COLUMN public.companies.is_branch IS 'Indicates if this is a branch of another company';

COMMENT ON FUNCTION check_duplicate_customers IS 'Checks for potential duplicate customers using fuzzy name matching, city, and phone comparison';
COMMENT ON FUNCTION get_company_branches IS 'Returns all branches/locations for a given company';
COMMENT ON FUNCTION get_company_with_branches IS 'Returns company with all its branches as JSON';
