/**
 * Video Compression Utility
 * Compresses videos to 720p max resolution with 1.5 Mbps bitrate
 */

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  targetBitrate: number; // in Mbps
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  targetBitrate: 1.5,
};

/**
 * Compress a video file to reduce size
 * @param file - Video file to compress
 * @param options - Compression options
 * @returns Compressed video blob
 */
export async function compressVideo(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      // Calculate dimensions maintaining aspect ratio
      let { videoWidth: width, videoHeight: height } = video;
      
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = opts.maxWidth;
          height = Math.round(width / aspectRatio);
        } else {
          height = opts.maxHeight;
          width = Math.round(height * aspectRatio);
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Check if MediaRecorder supports video recording
      const mimeType = getSupportedMimeType();
      
      if (!mimeType) {
        reject(new Error('Video compression not supported in this browser'));
        return;
      }

      try {
        // For videos, we'll use a simpler approach: just re-encode
        // Browser's MediaRecorder will handle compression automatically
        const stream = canvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: opts.targetBitrate * 1000000, // Convert Mbps to bps
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: mimeType });
          URL.revokeObjectURL(video.src);
          resolve(compressedBlob);
        };

        mediaRecorder.onerror = (e) => {
          URL.revokeObjectURL(video.src);
          reject(e);
        };

        // Start recording
        mediaRecorder.start();

        // Play video and draw frames to canvas
        video.currentTime = 0;
        video.play();

        const drawFrame = () => {
          if (video.ended || video.paused) {
            mediaRecorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, width, height);

          if (opts.onProgress) {
            const progress = (video.currentTime / video.duration) * 100;
            opts.onProgress(Math.min(progress, 99));
          }

          requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          drawFrame();
        };

        video.onended = () => {
          mediaRecorder.stop();
        };
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Get the best supported MIME type for video recording
 */
function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Check if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

/**
 * Validate video file
 * @param file - Video file to validate
 * @param maxDurationSeconds - Maximum duration in seconds (default 120 = 2 minutes)
 * @param maxSizeMB - Maximum size in MB (default 50 MB)
 */
export async function validateVideo(
  file: File,
  maxDurationSeconds: number = 120,
  maxSizeMB: number = 50
): Promise<{ valid: boolean; error?: string }> {
  // Check file type
  if (!isVideoFile(file)) {
    return { valid: false, error: 'File must be a video' };
  }

  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return { valid: false, error: `Video must be smaller than ${maxSizeMB} MB` };
  }

  // Check duration
  try {
    const duration = await getVideoDuration(file);
    if (duration > maxDurationSeconds) {
      const maxMinutes = Math.floor(maxDurationSeconds / 60);
      return { valid: false, error: `Video must be shorter than ${maxMinutes} minutes` };
    }
  } catch (error) {
    return { valid: false, error: 'Could not read video metadata' };
  }

  return { valid: true };
}
