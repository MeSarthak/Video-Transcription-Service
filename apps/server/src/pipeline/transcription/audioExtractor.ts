/**
 * Audio Extraction Service
 * Extracts audio from video files using FFmpeg
 * Converts to 16kHz mono WAV format for Whisper compatibility
 */

import ffmpeg from "fluent-ffmpeg";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Extract audio from video file
 * Whisper requires 16kHz mono WAV audio for optimal results
 *
 * @param {string} videoPath - Path to input video file
 * @param {string} outputDir - Directory to save extracted audio
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{audioPath: string, duration: number}>}
 */
export async function extractAudio(
  videoPath: any,
  outputDir: any,
  onProgress = () => {}
) {
  return new Promise((resolve, reject) => {
    const baseName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(outputDir, `${baseName}_audio.wav`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let duration = 0;

    // Get duration first
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (!err && metadata && metadata.format) {
        duration = metadata.format.duration || 0;
      }
    });

    ffmpeg(videoPath)
      // Audio settings for Whisper compatibility
      .audioFrequency(16000) // 16kHz sample rate (required by Whisper)
      .audioChannels(1) // Mono
      .audioCodec("pcm_s16le") // 16-bit PCM
      .format("wav")
      .output(audioPath)

      // Progress tracking
      .on("progress", (progress) => {
        if (progress.percent) {
          // @ts-ignore
          onProgress(Math.round(progress.percent));
        }
      })

      // Completion handler
      .on("end", () => {
        // Get duration from output file if not already set
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
          if (!err && metadata && metadata.format) {
            duration = metadata.format.duration || duration;
          }
          resolve({ audioPath, duration });
        });
      })

      // Error handler
      .on("error", (err) => {
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })

      .run();
  });
}

/**
 * Get video/audio file duration
 * @param {string} filePath - Path to media file
 * @returns {Promise<number>} Duration in seconds
 */
export async function getMediaDuration(filePath: any) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get media duration: ${err.message}`));
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Get media file metadata
 * @param {string} filePath - Path to media file
 * @returns {Promise<object>} Media metadata
 */
export async function getMediaInfo(filePath: any) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get media info: ${err.message}`));
        return;
      }

      const info = {
        duration: metadata.format.duration || 0,
        size: metadata.format.size || 0,
        bitrate: metadata.format.bit_rate || 0,
        format: metadata.format.format_name || "unknown",
        hasAudio: false,
        hasVideo: false,
        audioCodec: null,
        videoCodec: null,
      };

      // Check streams
      if (metadata.streams) {
        for (const stream of metadata.streams) {
          if (stream.codec_type === "audio") {
            info.hasAudio = true;
            // @ts-ignore
            info.audioCodec = stream.codec_name;
          }
          if (stream.codec_type === "video") {
            info.hasVideo = true;
            // @ts-ignore
            info.videoCodec = stream.codec_name;
          }
        }
      }

      resolve(info);
    });
  });
}

/**
 * Check if FFmpeg is available
 * @returns {Promise<boolean>}
 */
export async function checkFfmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}
