-- =====================================================
-- STORAGE METRICS TRACKING
-- =====================================================

-- Table to track storage usage over time
CREATE TABLE IF NOT EXISTS storage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_size_bytes BIGINT NOT NULL,
  photo_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track usage per technician
CREATE TABLE IF NOT EXISTS technician_storage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  avg_photos_per_report DECIMAL(5,2),
  avg_videos_per_report DECIMAL(5,2),
  avg_report_size_mb DECIMAL(10,2),
  last_report_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_metrics_measured_at ON storage_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_technician_storage_stats_technician ON technician_storage_stats(technician_id);

-- RLS Policies: Only super_admins can view storage metrics
ALTER TABLE storage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_storage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view storage metrics"
  ON storage_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can view technician stats"
  ON technician_storage_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Function to calculate and update storage metrics
CREATE OR REPLACE FUNCTION calculate_storage_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_bytes BIGINT;
  photo_cnt INTEGER;
  video_cnt INTEGER;
  report_cnt INTEGER;
BEGIN
  -- Calculate total storage from report_photos
  SELECT 
    COALESCE(SUM(file_size), 0),
    COUNT(*) FILTER (WHERE file_name NOT LIKE '%.mp4' AND file_name NOT LIKE '%.mov' AND file_name NOT LIKE '%.webm'),
    COUNT(*) FILTER (WHERE file_name LIKE '%.mp4' OR file_name LIKE '%.mov' OR file_name LIKE '%.webm'),
    COUNT(DISTINCT report_id)
  INTO total_bytes, photo_cnt, video_cnt, report_cnt
  FROM report_photos;
  
  -- Insert metric snapshot
  INSERT INTO storage_metrics (total_size_bytes, photo_count, video_count, report_count)
  VALUES (total_bytes, photo_cnt, video_cnt, report_cnt);
END;
$$;

-- Function to update technician storage stats
CREATE OR REPLACE FUNCTION update_technician_storage_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert stats for each technician
  INSERT INTO technician_storage_stats (
    technician_id,
    total_size_bytes,
    photo_count,
    video_count,
    report_count,
    avg_photos_per_report,
    avg_videos_per_report,
    avg_report_size_mb,
    last_report_at,
    updated_at
  )
  SELECT 
    sr.created_by as technician_id,
    COALESCE(SUM(srp.file_size), 0) as total_size_bytes,
    COUNT(*) FILTER (WHERE srp.file_name NOT LIKE '%.mp4' AND srp.file_name NOT LIKE '%.mov' AND srp.file_name NOT LIKE '%.webm') as photo_count,
    COUNT(*) FILTER (WHERE srp.file_name LIKE '%.mp4' OR srp.file_name LIKE '%.mov' OR srp.file_name LIKE '%.webm') as video_count,
    COUNT(DISTINCT sr.id) as report_count,
    ROUND(
      COUNT(*) FILTER (WHERE srp.file_name NOT LIKE '%.mp4' AND srp.file_name NOT LIKE '%.mov' AND srp.file_name NOT LIKE '%.webm')::DECIMAL / 
      NULLIF(COUNT(DISTINCT sr.id), 0)::DECIMAL,
      2
    ) as avg_photos_per_report,
    ROUND(
      COUNT(*) FILTER (WHERE srp.file_name LIKE '%.mp4' OR srp.file_name LIKE '%.mov' OR srp.file_name LIKE '%.webm')::DECIMAL / 
      NULLIF(COUNT(DISTINCT sr.id), 0)::DECIMAL,
      2
    ) as avg_videos_per_report,
    ROUND(COALESCE(SUM(srp.file_size), 0)::DECIMAL / (1024 * 1024 * NULLIF(COUNT(DISTINCT sr.id), 0)::DECIMAL), 2) as avg_report_size_mb,
    MAX(sr.submitted_at) as last_report_at,
    NOW() as updated_at
  FROM service_reports sr
  LEFT JOIN report_photos srp ON sr.id = srp.report_id
  WHERE sr.created_by IS NOT NULL
  GROUP BY sr.created_by
  ON CONFLICT (technician_id) 
  DO UPDATE SET
    total_size_bytes = EXCLUDED.total_size_bytes,
    photo_count = EXCLUDED.photo_count,
    video_count = EXCLUDED.video_count,
    report_count = EXCLUDED.report_count,
    avg_photos_per_report = EXCLUDED.avg_photos_per_report,
    avg_videos_per_report = EXCLUDED.avg_videos_per_report,
    avg_report_size_mb = EXCLUDED.avg_report_size_mb,
    last_report_at = EXCLUDED.last_report_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Initial calculation
SELECT calculate_storage_metrics();
SELECT update_technician_storage_stats();
