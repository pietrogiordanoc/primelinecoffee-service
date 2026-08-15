-- Function to get all staff members (admins and technicians)
-- This bypasses RLS to allow admins and technicians (if enabled) to see all users
CREATE OR REPLACE FUNCTION public.get_all_staff()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role user_role,
  is_active BOOLEAN,
  can_view_all_reports BOOLEAN,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  allow_technicians BOOLEAN;
BEGIN
  -- Get the current user's role
  SELECT users.role INTO user_role
  FROM public.users 
  WHERE users.id = auth.uid();

  -- Check if user is admin or super_admin
  IF user_role IN ('super_admin', 'admin') THEN
    -- Admins always have access
    NULL; -- Continue
  ELSIF user_role = 'technician' THEN
    -- Check if technicians are allowed to view staff
    SELECT technicians_can_view_staff INTO allow_technicians
    FROM public.system_settings
    LIMIT 1;
    
    IF NOT COALESCE(allow_technicians, false) THEN
      RAISE EXCEPTION 'Access denied. Technicians are not allowed to view staff directory.';
    END IF;
  ELSE
    -- Other roles have no access
    RAISE EXCEPTION 'Access denied. Admin or technician role required.';
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
    COALESCE(t.can_view_all_reports, false) as can_view_all_reports,
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
