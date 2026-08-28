-- Configure recipients for customer creation alerts.
-- Super admins always receive these alerts; this list controls other recipients.

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS customer_creation_notification_emails TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.system_settings.customer_creation_notification_emails IS
  'Explicit recipients for new customer alerts in addition to super admins';

NOTIFY pgrst, 'reload schema';