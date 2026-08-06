-- =====================================================
-- SYSTEM SETTINGS TABLE
-- Configurable settings for the application
-- =====================================================

-- Drop existing table if it exists (will remove old structure)
DROP TABLE IF EXISTS public.system_settings CASCADE;

CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email Configuration
  email_notifications_enabled BOOLEAN DEFAULT true,
  notify_technician BOOLEAN DEFAULT true,
  notify_super_admins BOOLEAN DEFAULT true,
  additional_notification_emails TEXT[] DEFAULT '{}', -- Array of additional emails
  email_sender_name TEXT DEFAULT 'Prime Line Coffee Service',
  email_sender_email TEXT,
  
  -- Company Information
  company_name TEXT DEFAULT 'Prime Line Coffee Service',
  company_logo_url TEXT,
  company_phone TEXT,
  company_address TEXT,
  
  -- System Configuration
  default_language TEXT DEFAULT 'es',
  timezone TEXT DEFAULT 'America/New_York',
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  
  -- Report Settings
  require_photos BOOLEAN DEFAULT false,
  max_photos_per_report INTEGER DEFAULT 10,
  auto_compress_images BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings (only one row should exist)
INSERT INTO public.system_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view settings
CREATE POLICY "Super admins can view system settings"
  ON public.system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Only super_admins can update settings
CREATE POLICY "Super admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, UPDATE ON public.system_settings TO authenticated;

COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings (single row)';
