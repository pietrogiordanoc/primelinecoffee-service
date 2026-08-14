-- Allow admins to insert reports in technician mode
-- This policy allows admins/super_admins to create reports with NULL technician_id

-- Add policy for admins to insert reports
CREATE POLICY "Admins can insert reports"
  ON public.service_reports FOR INSERT
  WITH CHECK (
    get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- Update technicians insert policy to handle NULL technician_id for admins
DROP POLICY IF EXISTS "Technicians can insert reports" ON public.service_reports;

CREATE POLICY "Technicians can insert reports"
  ON public.service_reports FOR INSERT
  WITH CHECK (
    -- Either a technician inserting their own report
    (technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    ))
    -- Or an admin inserting a report (can be NULL or any technician_id)
    OR (get_user_role(auth.uid()) IN ('super_admin', 'admin'))
  );
