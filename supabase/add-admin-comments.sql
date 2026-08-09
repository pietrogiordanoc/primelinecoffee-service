-- =====================================================
-- ADD ADMIN COMMENTS SYSTEM FOR REPORTS
-- =====================================================

-- Create admin_comments table
CREATE TABLE public.admin_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_admin_comments_report_id ON public.admin_comments(report_id);
CREATE INDEX idx_admin_comments_created_at ON public.admin_comments(created_at DESC);

-- RLS Policies - Only admins and super_admins can view/insert
ALTER TABLE public.admin_comments ENABLE ROW LEVEL SECURITY;

-- Admin/Super Admin can view all comments
CREATE POLICY "Admins can view all comments"
  ON public.admin_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Admin/Super Admin can insert comments
CREATE POLICY "Admins can insert comments"
  ON public.admin_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Admin/Super Admin can update their own comments
CREATE POLICY "Admins can update own comments"
  ON public.admin_comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Admin/Super Admin can delete their own comments
CREATE POLICY "Admins can delete own comments"
  ON public.admin_comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_comments TO authenticated;
