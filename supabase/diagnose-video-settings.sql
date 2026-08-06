-- =====================================================
-- DIAGNÓSTICO COMPLETO - Video Settings
-- =====================================================

-- 1. Ver TODOS los registros en system_settings
SELECT 
  id,
  enable_videos,
  max_video_size_mb,
  created_at
FROM public.system_settings
ORDER BY created_at;

-- 2. Ver SI la columna enable_videos existe
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'system_settings' 
  AND column_name = 'enable_videos';

-- 3. FORZAR UPDATE con el ID correcto
-- Primero vemos qué IDs existen
SELECT id, created_at 
FROM public.system_settings;

-- 4. Actualizar TODOS los registros (por si hay más de uno)
UPDATE public.system_settings
SET 
  enable_videos = true,
  max_video_size_mb = 50,
  max_video_duration_seconds = 120,
  video_compression_enabled = true,
  video_max_resolution_height = 720,
  video_target_bitrate_mbps = 1.5;

-- 5. VERIFICAR resultado final
SELECT 
  id,
  enable_videos as "✅ Videos?",
  max_video_size_mb as "📦 Max MB",
  max_video_duration_seconds as "⏱️ Max Sec",
  video_compression_enabled as "🗜️ Compress?"
FROM public.system_settings;
