-- Add all per-event notification settings to system_settings.
-- Safe to run even if some columns already exist.

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS notify_additional_emails BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS customer_creation_notification_emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notify_customer_creation_super_admins BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_customer_creation_technician BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_customer_creation_additional_emails BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_amendment_super_admins BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_amendment_technician BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_amendment_additional_emails BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS amendment_notification_emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notify_comment_super_admins BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comment_technician BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comment_additional_emails BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comment_notification_emails TEXT[] NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
