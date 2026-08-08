-- Function to get all staff members (admins and technicians)
-- This bypasses RLS to allow admins to see all users
CREATE OR REPLACE FUNCTION public.get_all_staff()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role user_role,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return all users with their technician data if applicable
  RETURN QUERY
  SELECT 
    COALESCE(t.id, u.id) as id,
    u.id as user_id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    COALESCE(t.is_active, u.is_active) as is_active,
    u.created_at
  FROM public.users u
  LEFT JOIN public.technicians t ON t.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_staff() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_all_staff() IS 'Returns all staff members (users) with their technician data. Requires admin or super_admin role.';
