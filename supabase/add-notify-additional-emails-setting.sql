-- Allow admins to disable additional report email recipients during tests.
-- Execute this migration in the Supabase SQL Editor.

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS notify_additional_emails BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.system_settings.notify_additional_emails IS
  'Send report notifications to the configured additional email recipients';

-- Refresh PostgREST's schema cache so the Settings page can save immediately.
NOTIFY pgrst, 'reload schema';