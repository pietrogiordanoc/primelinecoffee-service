-- =====================================================
-- ADD INDIVIDUAL TECHNICIAN PERMISSION TO VIEW ALL REPORTS
-- Allow specific technicians to view all reports (not just their own)
-- Useful for senior technicians or team leads
-- =====================================================

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

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'technicians'
  AND column_name = 'can_view_all_reports';
