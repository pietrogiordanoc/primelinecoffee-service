-- Add setting to allow technicians to view staff directory
-- Execute this in Supabase SQL Editor

-- Step 1: Add column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS technicians_can_view_staff BOOLEAN DEFAULT false;

-- Step 2: Update comment
COMMENT ON COLUMN public.system_settings.technicians_can_view_staff IS 'Allow technicians to view the staff directory';
