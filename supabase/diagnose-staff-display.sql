-- =====================================================
-- DIAGNOSE STAFF DISPLAY ISSUE
-- Check if sales representatives are being returned correctly
-- =====================================================

-- 1. Check all users and their roles
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.users
WHERE is_active = true
ORDER BY role, full_name;

-- 2. Check what get_all_staff() returns
SELECT * FROM public.get_all_staff()
ORDER BY role, full_name;

-- 3. Specifically check for sales_representative users
SELECT 
  id,
  email,
  full_name,
  role,
  is_active
FROM public.users
WHERE role = 'sales_representative'
  AND is_active = true;

-- 4. Check if enum has sales_representative value
SELECT 
  enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;
