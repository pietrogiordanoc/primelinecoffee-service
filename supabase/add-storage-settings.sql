-- =====================================================
-- ADD STORAGE SETTINGS TO SYSTEM SETTINGS
-- Makes storage limits configurable from admin panel
-- =====================================================

-- Add storage-related columns to system_settings
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS storage_warning_percent INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS storage_critical_percent INTEGER DEFAULT 85,
ADD COLUMN IF NOT EXISTS max_photo_size_mb INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_video_size_mb INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_video_duration_seconds INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS video_compression_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS video_max_resolution_height INTEGER DEFAULT 720,
ADD COLUMN IF NOT EXISTS video_target_bitrate_mbps DECIMAL(3,1) DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS enable_videos BOOLEAN DEFAULT true;

-- Update existing row with default values (if exists)
UPDATE public.system_settings
SET 
  storage_limit_gb = COALESCE(storage_limit_gb, 50),
  storage_warning_percent = COALESCE(storage_warning_percent, 70),
  storage_critical_percent = COALESCE(storage_critical_percent, 85),
  max_photo_size_mb = COALESCE(max_photo_size_mb, 10),
  max_video_size_mb = COALESCE(max_video_size_mb, 50),
  max_video_duration_seconds = COALESCE(max_video_duration_seconds, 120),
  video_compression_enabled = COALESCE(video_compression_enabled, true),
  video_max_resolution_height = COALESCE(video_max_resolution_height, 720),
  video_target_bitrate_mbps = COALESCE(video_target_bitrate_mbps, 1.5),
  enable_videos = COALESCE(enable_videos, true),
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add helpful comments
COMMENT ON COLUMN public.system_settings.storage_limit_gb IS 'Maximum storage allocation for this project (in GB)';
COMMENT ON COLUMN public.system_settings.storage_warning_percent IS 'Warning threshold percentage (e.g., 70 = 70%)';
COMMENT ON COLUMN public.system_settings.storage_critical_percent IS 'Critical threshold percentage (e.g., 85 = 85%)';
COMMENT ON COLUMN public.system_settings.max_photo_size_mb IS 'Maximum size per photo in MB';
COMMENT ON COLUMN public.system_settings.max_video_size_mb IS 'Maximum size per video in MB';
COMMENT ON COLUMN public.system_settings.max_video_duration_seconds IS 'Maximum video duration in seconds';
COMMENT ON COLUMN public.system_settings.video_compression_enabled IS 'Enable automatic video compression before upload';
COMMENT ON COLUMN public.system_settings.video_max_resolution_height IS 'Maximum video resolution height (e.g., 720 for 720p)';
COMMENT ON COLUMN public.system_settings.video_target_bitrate_mbps IS 'Target video bitrate in Mbps for compression';
COMMENT ON COLUMN public.system_settings.enable_videos IS 'Enable video upload functionality';
