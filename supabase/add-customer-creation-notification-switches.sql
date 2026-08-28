-- Configure recipients independently for customer creation alerts.

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS notify_customer_creation_super_admins BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_customer_creation_technician BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_customer_creation_additional_emails BOOLEAN NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';