-- =====================================================
-- VERIFY AND ENABLE VIDEO SETTINGS
-- Run this to check and enable video functionality
-- =====================================================

-- Check current settings
SELECT 
  enable_videos,
  max_video_size_mb,
  max_video_duration_seconds,
  video_compression_enabled,
  video_max_resolution_height,
  video_target_bitrate_mbps
FROM public.system_settings
WHERE id = '00000000-0000-0000-0000-000000000001';

-- If the columns don't exist, you need to run add-storage-settings.sql first

-- Enable videos (force to true)
UPDATE public.system_settings
SET 
  enable_videos = true,
  max_video_size_mb = COALESCE(max_video_size_mb, 50),
  max_video_duration_seconds = COALESCE(max_video_duration_seconds, 120),
  video_compression_enabled = COALESCE(video_compression_enabled, true),
  video_max_resolution_height = COALESCE(video_max_resolution_height, 720),
  video_target_bitrate_mbps = COALESCE(video_target_bitrate_mbps, 1.5),
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify the update
SELECT 
  enable_videos,
  max_video_size_mb,
  max_video_duration_seconds,
  video_compression_enabled
FROM public.system_settings
WHERE id = '00000000-0000-0000-0000-000000000001';
