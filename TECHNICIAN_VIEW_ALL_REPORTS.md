ee# Technician View All Reports Feature

## Overview
This feature allows administrators to grant individual technicians permission to view all reports from all technicians, not just their own. This is useful for senior technicians, team leads, or supervisors.

## What Was Implemented

### 1. Database Changes
- **File**: `supabase/add-technician-view-all-reports.sql`
- Added `can_view_all_reports` column to `technicians` table
- Default value: `false` (technicians only see their own reports by default)
- Index added for performance

### 2. Backend Changes
- **File**: `supabase/function-get-all-staff.sql`
- Updated `get_all_staff()` function to return the new field

### 3. Frontend Changes

#### Admin Interface (`src/pages/admin/Technicians.tsx`)
- Added new "View All" column in the staff table
- Shows a toggle switch for each technician (only for technician role)
- Toggle switch changes color when enabled (blue = on, gray = off)
- Mobile view also includes the toggle

#### Technician Interface (`src/pages/technician/History.tsx`)
- Modified to check the `can_view_all_reports` permission
- If enabled: loads ALL reports from all technicians
- If disabled: loads only the technician's own reports (default behavior)

#### Type Definitions (`src/types/index.ts`)
- Added `can_view_all_reports?: boolean` to `Technician` interface

## Setup Instructions

### Step 1: Execute SQL in Supabase (REQUIRED)

1. Go to: https://supabase.com/dashboard
2. Select your **Prime Line Coffee** project
3. Open **SQL Editor**
4. Copy and execute the following SQL:

```sql
-- Add column to technicians table
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS can_view_all_reports BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.technicians.can_view_all_reports 
IS 'Allow this technician to view all reports from all technicians';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_technicians_can_view_all_reports 
ON public.technicians(can_view_all_reports) 
WHERE can_view_all_reports = true;

-- Update get_all_staff function
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
```

5. Click **Run** or press `Ctrl+Enter`
6. Verify success message

### Step 2: Deploy to Netlify

After executing the SQL, deploy your changes:

```bash
git add .
git commit -m "Add individual technician permission to view all reports"
git push
```

## How to Use

### For Administrators

1. Go to **Admin Panel** → **Staff** → **Techs tab**
2. Find the technician you want to grant permission to
3. In the **"View All"** column, click the toggle switch
4. When the toggle is **blue/enabled**: technician can view all reports
5. When the toggle is **gray/disabled**: technician can only view their own reports

### For Technicians

- **Default behavior**: You only see your own reports in the History page
- **When enabled by admin**: You see ALL reports from all technicians in the History page
- No visual indicator in the technician interface (permission is transparent)

## Use Cases

This feature is useful for:
- **Team Leads**: Senior technicians who supervise others
- **Quality Control**: Technicians who review work from the team
- **Training**: Experienced technicians mentoring new ones
- **Coverage**: Technicians who need to help with others' work

## Technical Details

### Database Structure
```sql
technicians
├── id (uuid)
├── user_id (uuid)
├── is_active (boolean)
├── can_view_all_reports (boolean) ← NEW FIELD
└── ...
```

### Permission Logic
```typescript
// In History.tsx
if (!techData.can_view_all_reports) {
  // Load only own reports
  query = query.eq('technician_email', userProfile?.email);
} else {
  // Load all reports (no filter)
}
```

## Security Considerations

- Permission is controlled at the application level
- Only admins can change the permission
- Technicians cannot see or modify their own permission
- Permission is stored per technician (not globally)
- Default is always `false` (restrictive by default)

## Files Modified

1. `supabase/add-technician-view-all-reports.sql` (NEW)
2. `supabase/function-get-all-staff.sql` (UPDATED)
3. `src/types/index.ts` (UPDATED)
4. `src/pages/admin/Technicians.tsx` (UPDATED)
5. `src/pages/technician/History.tsx` (UPDATED)
6. `TECHNICIAN_VIEW_ALL_REPORTS.md` (NEW - this file)
