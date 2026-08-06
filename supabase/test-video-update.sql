-- =====================================================
-- TEST VIDEO UPDATE - Visual Verification
-- Run this to verify settings are updating correctly
-- =====================================================

-- Add a version field to track updates
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT 'v1.0';

-- Update to version 2.0 with videos enabled
UPDATE public.system_settings
SET 
  app_version = 'v2.0-VIDEO-ENABLED',
  enable_videos = true,
  max_video_size_mb = 50,
  max_video_duration_seconds = 120,
  video_compression_enabled = true,
  video_max_resolution_height = 720,
  video_target_bitrate_mbps = 1.5,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify the update with visual output
SELECT 
  '🎥 VIDEO SETTINGS - v2.0' as status,
  app_version,
  enable_videos as "Videos Enabled?",
  max_video_size_mb as "Max Video MB",
  max_video_duration_seconds as "Max Duration (sec)",
  video_compression_enabled as "Compression ON?",
  video_max_resolution_height as "Max Resolution",
  updated_at as "Last Update"
FROM public.system_settings
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Show all storage settings
SELECT 
  storage_limit_gb,
  storage_warning_percent,
  storage_critical_percent,
  max_photo_size_mb,
  max_video_size_mb,
  enable_videos
FROM public.system_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
