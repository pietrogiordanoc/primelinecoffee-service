-- Allow NULL technician_id in service_reports for admin-created reports
-- This allows admins/managers to create reports in technician mode without having a technician record

-- Drop the NOT NULL constraint on technician_id
ALTER TABLE public.service_reports 
ALTER COLUMN technician_id DROP NOT NULL;

-- Add a comment explaining why NULL is allowed
COMMENT ON COLUMN public.service_reports.technician_id IS 
'The technician who performed the service. Can be NULL for reports created by admins/managers in technician mode.';

-- Update the index to handle NULL values efficiently
DROP INDEX IF EXISTS idx_service_reports_technician;
CREATE INDEX idx_service_reports_technician ON public.service_reports(technician_id) 
WHERE technician_id IS NOT NULL;
