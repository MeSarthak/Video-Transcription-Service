import { generateHLS } from "./hls.js";
import { generateThumbnail } from "./thumbnail.js";
import { generateMasterPlaylist } from "./masterPlaylist.js";
import { uploadHLSFolder, uploadSubtitleFiles } from "./upload.js";
import { getVideoDuration } from "./duration.js";
import { v4 as uuidv4 } from "uuid";
import * as fs from "node:fs";
import * as path from "node:path";
import { TEMP_DIR } from "./paths.js";
import { logger } from "../lib/logger.js";

// Transcription imports
import {
  extractAudio,
  transcribeWithProgress,
  generateAllFormats,
  checkWhisperCli,
} from "./transcription/index.js";

interface TranscriptionOptions {
  language?: string;
  task?: string;
  thumbnailPath?: string;
}

interface AudioExtractionResult {
  audioPath: string;
  duration: number;
}

interface TranscriptionResult {
  segments: Array<{ start: number; end: number; text: string }>;
  detectedLanguage: string;
}

/**
 * Generate transcription and subtitles for a video
 */
const generateTranscription = async (
  videoPath: string,
  videoId: string,
  options: TranscriptionOptions = {},
) => {
  const { language = "auto", task = "transcribe" } = options;

  // Check if Whisper is available
  const whisperAvailable = await checkWhisperCli();
  if (!whisperAvailable) {
    throw new Error(
      "Whisper CLI is not installed. Run: pip install openai-whisper",
    );
  }

  // Create output directory for transcription
  const transcriptionDir = path.join(TEMP_DIR, videoId, "transcription");
  if (!fs.existsSync(transcriptionDir)) {
    fs.mkdirSync(transcriptionDir, { recursive: true });
  }

  logger.info({ videoId }, "Transcription: starting");
  logger.info({ language, task }, "Transcription: options");

  // Step 1: Extract audio from video
  logger.info({ videoId }, "Transcription: step 1 — extracting audio");
  const { audioPath, duration } = (await extractAudio(
    videoPath,
    transcriptionDir,
  )) as AudioExtractionResult;
  logger.info({ audioPath, duration }, "Transcription: audio extracted");

  // Step 2: Transcribe audio using Whisper
  logger.info({ videoId }, "Transcription: step 2 — transcribing with Whisper");
  const { segments, detectedLanguage } = (await transcribeWithProgress(
    audioPath,
    duration,
    (progress: number) => {
      logger.debug({ progress }, "Transcription: progress");
    },
    { language, task, outputDir: transcriptionDir },
  )) as TranscriptionResult;
  logger.info({ detectedLanguage, segmentCount: segments.length }, "Transcription: complete");

  // Step 3: Generate subtitle files (SRT, VTT, JSON, TXT)
  logger.info({ videoId }, "Transcription: step 3 — generating subtitle files");
  const subtitleFiles = await generateAllFormats(
    segments,
    transcriptionDir,
    "subtitle",
    {
      language,
      detectedLanguage,
      task,
      videoId,
      duration,
    },
  );
  logger.info({ videoId }, "Transcription: subtitle files generated");

  // Step 4: Upload subtitle files to Azure
  logger.info({ videoId }, "Transcription: step 4 — uploading subtitle files");
  const uploadedSubtitles = await uploadSubtitleFiles(
    subtitleFiles as Record<string, string>,
    videoId,
  );
  logger.info({ videoId }, "Transcription: subtitle files uploaded");

  // Cleanup: Remove local transcription files
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    // Clean up subtitle files after upload
    Object.values(subtitleFiles as Record<string, string>).forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    // Remove transcription directory if empty
    if (fs.existsSync(transcriptionDir)) {
      fs.rmdirSync(transcriptionDir, { recursive: true } as fs.RmDirOptions);
    }
  } catch (cleanupErr: unknown) {
    logger.warn(
      { err: cleanupErr },
      "Transcription: cleanup warning",
    );
  }

  return {
    files: uploadedSubtitles,
    detectedLanguage,
    segmentCount: segments.length,
  };
};

const processVideo = async (
  videoPath: string,
  existingVideoId?: string,
  subtitleOptions: TranscriptionOptions = {},
) => {
  // Normalize path separators to forward slashes for cross-platform FFmpeg compatibility.
  // On Windows, multer produces backslash paths (e.g. public\temp\video.mp4) which
  // FFmpeg/FFprobe misinterpret (\t, \p etc. as escape sequences).
  const normalizedPath = videoPath.replace(/\\/g, "/");

  // Use existing ID if provided, otherwise generate new (fallback)
  const videoId = existingVideoId || uuidv4();
  let baseFolder: string | undefined;

  try {
    logger.info({ videoId }, "VideoProcessor: starting processVideo");
    logger.info({ normalizedPath }, "VideoProcessor: local video path");

    // Step 1: Generate HLS segments
    logger.info({ videoId }, "VideoProcessor: step 1 — generating HLS segments");
    const hlsResult = await generateHLS(normalizedPath, videoId);
    baseFolder = hlsResult.baseFolder;
    const variants = hlsResult.variants;
    logger.info({ baseFolder }, "VideoProcessor: HLS generation complete");

    // Step 2: Generate thumbnail and calculate duration
    logger.info({ videoId }, "VideoProcessor: step 2 — generating thumbnail and duration");

    let thumbnailLocal: string;
    if (
      subtitleOptions.thumbnailPath &&
      fs.existsSync(subtitleOptions.thumbnailPath)
    ) {
      // User supplied a thumbnail — copy it into the expected location
      const outDir = path.join(TEMP_DIR, videoId);
      fs.mkdirSync(outDir, { recursive: true });
      const destPath = path.join(outDir, "thumb.jpg");
      fs.copyFileSync(subtitleOptions.thumbnailPath, destPath);
      // Clean up the uploaded thumbnail temp file
      try {
        fs.unlinkSync(subtitleOptions.thumbnailPath);
      } catch {}
      thumbnailLocal = destPath;
      logger.info({ thumbnailLocal }, "VideoProcessor: using user-supplied thumbnail");
    } else {
      thumbnailLocal = (await generateThumbnail(normalizedPath, videoId)) as string;
      logger.info({ thumbnailLocal }, "VideoProcessor: thumbnail generated");
    }

    const duration = await getVideoDuration(normalizedPath);
    logger.info({ duration }, "VideoProcessor: video duration");

    // Step 3: Generate master playlist
    logger.info({ videoId }, "VideoProcessor: step 3 — generating master playlist");
    await generateMasterPlaylist(videoId, variants);
    logger.info({ videoId }, "VideoProcessor: master playlist generated");

    // Step 4: Upload HLS folder to Azure Blob Storage
    logger.info({ videoId }, "VideoProcessor: step 4 — uploading HLS folder");
    const uploadedMap = await uploadHLSFolder(baseFolder, videoId);
    logger.info({ count: Object.keys(uploadedMap).length }, "VideoProcessor: upload complete");

    const masterBlob = `${videoId}/master.m3u8`;
    const thumbnailBlob = `${videoId}/thumb.jpg`;

    // Step 5: Generate transcription and subtitles (non-blocking for video processing)
    let transcriptionResult: {
      error?: string;
      files: Record<string, string> | null;
      detectedLanguage: string | null;
      segmentCount: number;
    } | null = null;
    const { language = "auto", task = "transcribe" } = subtitleOptions;

    try {
      logger.info({ videoId }, "VideoProcessor: step 5 — generating transcription");
      transcriptionResult = await generateTranscription(normalizedPath, videoId, {
        language,
        task,
      });
      logger.info(
        { detectedLanguage: transcriptionResult.detectedLanguage },
        "VideoProcessor: transcription complete",
      );
    } catch (transcriptionError: unknown) {
      // Log error but don't fail the entire video processing
      const errorMessage =
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError);
      logger.error({ err: transcriptionError }, "VideoProcessor: transcription failed (non-fatal)");
      transcriptionResult = {
        error: errorMessage,
        files: null,
        detectedLanguage: null,
        segmentCount: 0,
      };
    }

    logger.info({ videoId }, "VideoProcessor: video processing finished successfully");

    return {
      videoId,
      duration,
      variants,
      masterUrl: uploadedMap[masterBlob] ?? masterBlob,
      thumbnailUrl: uploadedMap[thumbnailBlob] ?? thumbnailBlob,
      uploadedFiles: uploadedMap,
      transcription: transcriptionResult,
    };
  } catch (err) {
    logger.error({ videoId, err }, "VideoProcessor: video processing failed");
    throw err;
  } finally {
    // Wrap cleanup in try-catch to prevent masking original error
    try {
      // Cleanup local temp folder
      if (baseFolder && fs.existsSync(baseFolder)) {
        logger.info({ baseFolder }, "VideoProcessor: cleaning up temp folder");
        fs.rmSync(baseFolder, { recursive: true, force: true });
      }
      // Cleanup the uploaded original video file from disk
      if (normalizedPath && fs.existsSync(normalizedPath)) {
        logger.info({ normalizedPath }, "VideoProcessor: cleaning up original video file");
        fs.unlinkSync(normalizedPath);
      }
    } catch (cleanupErr) {
      // Log cleanup errors but don't throw to preserve original error
      logger.error({ err: cleanupErr }, "VideoProcessor: cleanup error");
    }
  }
};

export { processVideo, generateTranscription };
