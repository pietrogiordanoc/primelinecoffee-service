-- Add service_type column to service_reports table
-- This column will store the type of service: Delivery, Pick up, Service, Tune up, Training, Other

-- Add the column
ALTER TABLE service_reports 
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Add a check constraint to ensure valid values
ALTER TABLE service_reports
DROP CONSTRAINT IF EXISTS service_type_check;

ALTER TABLE service_reports
ADD CONSTRAINT service_type_check 
CHECK (service_type IN ('Delivery', 'Pick up', 'Service', 'Tune up', 'Training', 'Other') OR service_type IS NULL);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_reports_service_type 
ON service_reports(service_type);

-- Add a comment to document the column
COMMENT ON COLUMN service_reports.service_type IS 'Type of service: Delivery, Pick up, Service, Tune up, Training, or Other';
