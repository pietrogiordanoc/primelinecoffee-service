-- =====================================================
-- FIX EMAIL_LOGS FOREIGN KEY CONSTRAINT
-- Add ON DELETE CASCADE to allow report deletion
-- =====================================================

-- Step 1: Drop the existing constraint
ALTER TABLE public.email_logs
DROP CONSTRAINT IF EXISTS email_logs_report_id_fkey;

-- Step 2: Re-add the constraint with CASCADE
ALTER TABLE public.email_logs
ADD CONSTRAINT email_logs_report_id_fkey
FOREIGN KEY (report_id)
REFERENCES public.service_reports(id)
ON DELETE CASCADE;

-- Verify the constraint
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  confdeltype AS on_delete_action
FROM pg_constraint
WHERE conname = 'email_logs_report_id_fkey';

-- on_delete_action codes:
-- 'a' = NO ACTION
-- 'r' = RESTRICT  
-- 'c' = CASCADE (this is what we want)
-- 'n' = SET NULL
-- 'd' = SET DEFAULT
