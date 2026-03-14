import { generateHLS } from "./hls.js";
import { generateThumbnail } from "./thumbnail.js";
import { generateMasterPlaylist } from "./masterPlaylist.js";
import { uploadHLSFolder, uploadSubtitleFiles } from "./upload.js";
import { getVideoDuration } from "./duration.js";
import { v4 as uuidv4 } from "uuid";
import * as fs from "node:fs";
import * as path from "node:path";

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
}

/**
 * Generate transcription and subtitles for a video
 *
 * @param {string} videoPath - Path to the video file
 * @param {string} videoId - Video ID for output organization
 * @param {TranscriptionOptions} options - Transcription options
 * @returns {Promise<{files: any, detectedLanguage: string, segmentCount: number}>}
 */
const generateTranscription = async (videoPath: string, videoId: string, options: TranscriptionOptions = {}) => {
  const { language = "auto", task = "transcribe" } = options;

  // Check if Whisper is available
  const whisperAvailable = await checkWhisperCli();
  if (!whisperAvailable) {
    throw new Error(
      "Whisper CLI is not installed. Run: pip install openai-whisper"
    );
  }

  // Create output directory for transcription
  const transcriptionDir = path.join("./public/temp", videoId, "transcription");
  if (!fs.existsSync(transcriptionDir)) {
    fs.mkdirSync(transcriptionDir, { recursive: true });
  }

  console.log(`[Transcription] Starting transcription for video ${videoId}`);
  console.log(`[Transcription] Language: ${language}, Task: ${task}`);

  // Step 1: Extract audio from video
  console.log(`[Transcription] Step 1: Extracting audio...`);
  // @ts-ignore
  const { audioPath, duration } = await extractAudio(
    videoPath,
    transcriptionDir
  );
  console.log(`[Transcription] Audio extracted: ${audioPath} (${duration}s)`);

  // Step 2: Transcribe audio using Whisper
  console.log(`[Transcription] Step 2: Transcribing with Whisper...`);
  // @ts-ignore
  const { segments, detectedLanguage } = await transcribeWithProgress(
    audioPath,
    duration as number,
    // @ts-ignore
    (progress: number) => {
      console.log(`[Transcription] Progress: ${progress}%`);
    },
    { language, task, outputDir: transcriptionDir }
  );
  console.log(
    `[Transcription] Transcription complete. Detected language: ${detectedLanguage}`
  );
  console.log(`[Transcription] Generated ${segments.length} segments`);

  // Step 3: Generate subtitle files (SRT, VTT, JSON, TXT)
  console.log(`[Transcription] Step 3: Generating subtitle files...`);
  const subtitleFiles = await generateAllFormats(
    segments,
    transcriptionDir,
    "subtitle",
    {
      language,
      detectedLanguage,
      task,
      videoId,
      duration: duration as number,
    }
  );
  console.log(`[Transcription] Subtitle files generated`);

  // Step 4: Upload subtitle files to Azure
  console.log(
    `[Transcription] Step 4: Uploading subtitle files to cloud storage...`
  );
  const uploadedSubtitles = await uploadSubtitleFiles(subtitleFiles, videoId);
  console.log(`[Transcription] Subtitle files uploaded`);

  // Cleanup: Remove local transcription files
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    // Clean up subtitle files after upload
    Object.values(subtitleFiles).forEach((filePath) => {
      if (fs.existsSync(filePath as string)) {
        fs.unlinkSync(filePath as string);
      }
    });
    // Remove transcription directory if empty
    if (fs.existsSync(transcriptionDir)) {
      fs.rmdirSync(transcriptionDir, { recursive: true });
    }
  } catch (cleanupErr: any) {
    console.warn(`[Transcription] Cleanup warning: ${cleanupErr.message}`);
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
  subtitleOptions: TranscriptionOptions = {}
) => {
  // Normalize path separators to forward slashes for cross-platform FFmpeg compatibility.
  // On Windows, multer produces backslash paths (e.g. public\temp\video.mp4) which
  // FFmpeg/FFprobe misinterpret (\t, \p etc. as escape sequences).
  const normalizedPath = videoPath.replace(/\\/g, "/");

  // Use existing ID if provided, otherwise generate new (fallback)
  const videoId = existingVideoId || uuidv4();
  let baseFolder: string | undefined;

  try {
    console.log(
      `[VideoProcessor] Starting processVideo for videoId: ${videoId}`
    );
    console.log(`[VideoProcessor] Local video path: ${normalizedPath}`);

    // First await generateHLS to capture baseFolder
    console.log(`[VideoProcessor] Step 1: Generating HLS segments...`);
    const hlsResult = await generateHLS(normalizedPath, videoId);
    baseFolder = hlsResult.baseFolder;
    const variants = hlsResult.variants;
    console.log(
      `[VideoProcessor] HLS generation complete. Base folder: ${baseFolder}`
    );

    // Then run thumbnail and duration in parallel
    console.log(
      `[VideoProcessor] Step 2: Generating Thumbnail and calculating Duration...`
    );
    const [thumbnailLocal, duration] = await Promise.all([
      generateThumbnail(normalizedPath, videoId),
      getVideoDuration(normalizedPath),
    ]);
    console.log(`[VideoProcessor] Thumbnail generated: ${thumbnailLocal}`);
    console.log(`[VideoProcessor] Video Duration: ${duration}`);

    // Step 4: Master playlist generate
    console.log(`[VideoProcessor] Step 3: Generating Master Playlist...`);
    await generateMasterPlaylist(videoId, variants);
    console.log(`[VideoProcessor] Master Playlist generated.`);

    // Step 5: Upload folder -> Azure Blob Storage
    console.log(
      `[VideoProcessor] Step 4: Uploading HLS folder to Cloud Storage...`
    );
    const uploadedMap = await uploadHLSFolder(baseFolder, videoId);
    console.log(
      `[VideoProcessor] Upload complete. ${Object.keys(uploadedMap).length} files uploaded.`
    );

    const masterBlob = `${videoId}/master.m3u8`;
    const thumbnailBlob = `${videoId}/thumb.jpg`;

    // Step 6: Generate transcription and subtitles (non-blocking for video processing)
    let transcriptionResult: any = null;
    const { language = "auto", task = "transcribe" } = subtitleOptions;

    try {
      console.log(
        `[VideoProcessor] Step 5: Generating transcription and subtitles...`
      );
      transcriptionResult = await generateTranscription(normalizedPath, videoId, {
        language,
        task,
      });
      console.log(
        `[VideoProcessor] Transcription complete. Detected: ${transcriptionResult.detectedLanguage}`
      );
    } catch (transcriptionError: any) {
      // Log error but don't fail the entire video processing
      console.error(
        `[VideoProcessor] Transcription failed (non-fatal): ${transcriptionError.message}`
      );
      transcriptionResult = {
        error: transcriptionError.message,
        files: null,
        detectedLanguage: null,
        segmentCount: 0,
      };
    }

    console.log(
      `[VideoProcessor] Video processing finished successfully for ${videoId}`
    );

    return {
      videoId,
      duration,
      variants,
      // @ts-ignore
      masterUrl: uploadedMap[masterBlob] || masterBlob,
      // @ts-ignore
      thumbnailUrl: uploadedMap[thumbnailBlob] || thumbnailBlob,
      uploadedFiles: uploadedMap,
      // Transcription results
      transcription: transcriptionResult,
    };
  } catch (err) {
    console.error(
      `[VideoProcessor] Video Processing Failed for ${videoId}:`,
      err
    );
    throw err;
  } finally {
    // Wrap cleanup in try-catch to prevent masking original error
    try {
      // Cleanup local temp folder
      if (baseFolder && fs.existsSync(baseFolder)) {
        console.log(`[VideoProcessor] Cleaning up temp folder: ${baseFolder}`);
        fs.rmSync(baseFolder, { recursive: true, force: true });
      }
      // Cleanup the uploaded original video file from disk
      if (normalizedPath && fs.existsSync(normalizedPath)) {
        // console.log(`[VideoProcessor] Cleaning up original video file: ${normalizedPath}`);
        // fs.unlinkSync(normalizedPath);
      }
    } catch (cleanupErr) {
      // Log cleanup errors but don't throw to preserve original error
      console.error("[VideoProcessor] Cleanup error:", cleanupErr);
    }
  }
};

export { processVideo, generateTranscription };
