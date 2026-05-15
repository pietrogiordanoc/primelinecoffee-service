-- =====================================================
-- PRIME LINE COFFEE SERVICE - DATABASE SCHEMA
-- Technical Service Management System
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'technician');
CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'reviewed', 'completed');
CREATE TYPE field_type AS ENUM ('text', 'textarea', 'number', 'email', 'phone', 'date', 'time', 'datetime', 'select', 'radio', 'checkbox', 'signature', 'file');

-- =====================================================
-- TABLES
-- =====================================================

-- Users Table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies Table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technicians Table
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  specialization TEXT,
  certifications TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technician-Company Assignments
CREATE TABLE public.technician_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id, company_id)
);

-- Dynamic Forms
CREATE TABLE public.dynamic_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Fields (for dynamic form builder)
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder TEXT,
  default_value TEXT,
  options JSONB, -- For select, radio, checkbox options
  validation_rules JSONB, -- {required, min, max, pattern, etc}
  conditional_logic JSONB, -- {show_if: {field: 'x', value: 'y'}}
  order_index INT NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Reports
CREATE TABLE public.service_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL REFERENCES public.dynamic_forms(id),
  technician_id UUID NOT NULL REFERENCES public.technicians(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  status report_status DEFAULT 'draft',
  form_data JSONB NOT NULL, -- Stores all form field responses
  signature_url TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report Photos
CREATE TABLE public.report_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  file_size INT, -- bytes
  mime_type TEXT,
  caption TEXT,
  order_index INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT, -- 'report', 'company', 'technician', etc
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Notifications Log
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.service_reports(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent', -- sent, failed, bounced
  error_message TEXT,
  resend_id TEXT -- Resend API message ID
);

-- System Settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_technicians_user_id ON public.technicians(user_id);
CREATE INDEX idx_service_reports_technician ON public.service_reports(technician_id);
CREATE INDEX idx_service_reports_company ON public.service_reports(company_id);
CREATE INDEX idx_service_reports_status ON public.service_reports(status);
CREATE INDEX idx_service_reports_created ON public.service_reports(created_at DESC);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_report_photos_report_id ON public.report_photos(report_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- Super admins can insert/update/delete users
CREATE POLICY "Super admins can manage users"
  ON public.users FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- COMPANIES TABLE POLICIES
-- =====================================================

-- Admins can manage companies
CREATE POLICY "Admins can view companies"
  ON public.companies FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Super admins can delete companies"
  ON public.companies FOR DELETE
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Technicians can view assigned companies
CREATE POLICY "Technicians can view assigned companies"
  ON public.companies FOR SELECT
  USING (
    get_user_role(auth.uid()) = 'technician' AND
    id IN (
      SELECT company_id FROM public.technician_companies tc
      JOIN public.technicians t ON t.id = tc.technician_id
      WHERE t.user_id = auth.uid()
    )
  );

-- =====================================================
-- TECHNICIANS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view technicians"
  ON public.technicians FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can manage technicians"
  ON public.technicians FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Technicians can view own record"
  ON public.technicians FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- TECHNICIAN_COMPANIES POLICIES
-- =====================================================

CREATE POLICY "Admins can manage assignments"
  ON public.technician_companies FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Technicians can view own assignments"
  ON public.technician_companies FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- DYNAMIC_FORMS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can manage forms"
  ON public.dynamic_forms FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Technicians can view active forms"
  ON public.dynamic_forms FOR SELECT
  USING (is_active = true);

-- =====================================================
-- FORM_FIELDS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can manage form fields"
  ON public.form_fields FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Technicians can view form fields"
  ON public.form_fields FOR SELECT
  USING (
    form_id IN (SELECT id FROM public.dynamic_forms WHERE is_active = true)
  );

-- =====================================================
-- SERVICE_REPORTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view all reports"
  ON public.service_reports FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.service_reports FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Technicians can view own reports"
  ON public.service_reports FOR SELECT
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can insert reports"
  ON public.service_reports FOR INSERT
  WITH CHECK (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Technicians can update own draft reports"
  ON public.service_reports FOR UPDATE
  USING (
    technician_id IN (
      SELECT id FROM public.technicians WHERE user_id = auth.uid()
    ) AND status = 'draft'
  );

-- =====================================================
-- REPORT_PHOTOS TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view photos of accessible reports"
  ON public.report_photos FOR SELECT
  USING (
    report_id IN (SELECT id FROM public.service_reports)
  );

CREATE POLICY "Technicians can insert photos to own reports"
  ON public.report_photos FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT sr.id FROM public.service_reports sr
      JOIN public.technicians t ON t.id = sr.technician_id
      WHERE t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all photos"
  ON public.report_photos FOR ALL
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- =====================================================
-- ACTIVITY_LOGS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- EMAIL_LOGS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view email logs"
  ON public.email_logs FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

-- =====================================================
-- SYSTEM_SETTINGS TABLE POLICIES
-- =====================================================

CREATE POLICY "Admins can view settings"
  ON public.system_settings FOR SELECT
  USING (get_user_role(auth.uid()) IN ('super_admin', 'admin'));

CREATE POLICY "Super admins can manage settings"
  ON public.system_settings FOR ALL
  USING (get_user_role(auth.uid()) = 'super_admin');

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.dynamic_forms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for service report files
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-reports', 'service-reports', false)
ON CONFLICT DO NOTHING;

-- Storage policies for service-reports bucket
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'service-reports' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view accessible files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-reports');

CREATE POLICY "Admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'service-reports' AND
    get_user_role(auth.uid()) IN ('super_admin', 'admin')
  );

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('email_notifications', '{"enabled": true, "recipients": []}', 'Email notification settings'),
  ('report_auto_submit', '{"enabled": false}', 'Auto-submit reports after completion'),
  ('photo_optimization', '{"max_width": 1500, "max_height": 1500, "quality": 0.75, "max_size_mb": 1}', 'Photo optimization settings'),
  ('company_name', '"Prime Line Coffee Service"', 'Company name for emails and branding'),
  ('support_email', '"support@primelinecoffee.com"', 'Support contact email')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View for report summary with related data
CREATE OR REPLACE VIEW public.report_summary AS
SELECT
  sr.id,
  sr.status,
  sr.created_at,
  sr.submitted_at,
  df.name AS form_name,
  c.name AS company_name,
  u.full_name AS technician_name,
  u.email AS technician_email,
  (SELECT COUNT(*) FROM public.report_photos WHERE report_id = sr.id) AS photo_count
FROM public.service_reports sr
JOIN public.dynamic_forms df ON df.id = sr.form_id
JOIN public.companies c ON c.id = sr.company_id
JOIN public.technicians t ON t.id = sr.technician_id
JOIN public.users u ON u.id = t.user_id;

-- Grant access to view
GRANT SELECT ON public.report_summary TO authenticated;

-- =====================================================
-- COMPLETED
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- Make sure to replace any placeholder values
-- =====================================================
