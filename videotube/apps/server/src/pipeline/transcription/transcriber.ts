/**
 * Transcription Service
 * Uses OpenAI Whisper CLI (Python) to transcribe audio files
 *
 * Requirements:
 * - Python 3.8+
 * - pip install openai-whisper
 * - For GPU acceleration: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
 *
 * Supports 99+ languages with auto-detection and translation to English
 * Uses 'base' model (74MB) for optimal speed/accuracy balance
 * GPU acceleration enabled automatically when CUDA is available
 */

import { spawn, execSync } from "child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { getLanguageName } from "./languages.js";

/**
 * Model configuration
 * Using 'base' model for optimal speed/accuracy balance
 * - base: 74MB, ~10x realtime on GPU, good accuracy for most use cases
 * - small: 244MB, ~5x realtime on GPU, better accuracy
 * - medium: 769MB, ~2x realtime on GPU, high accuracy
 */
const WHISPER_MODEL = process.env.WHISPER_MODEL || "base";

/**
 * Check if CUDA (GPU) is available
 * Caches the result after first check
 */
let cudaAvailable: boolean | null = null;
export function checkCudaAvailable(): boolean {
  if (cudaAvailable !== null) return cudaAvailable;

  try {
    const result = execSync(
      'python -c "import torch; print(torch.cuda.is_available())"',
      {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 10000,
      }
    ).trim();
    cudaAvailable = result === "True";
    console.log(
      `[Whisper] CUDA GPU acceleration: ${cudaAvailable ? "ENABLED" : "DISABLED (CPU mode)"}`
    );
  } catch (e) {
    cudaAvailable = false;
    console.log("[Whisper] CUDA check failed, using CPU mode");
  }
  return cudaAvailable;
}

/**
 * Transcribe audio file using Whisper CLI
 *
 * @param {string} audioPath - Path to audio file (WAV format, 16kHz mono)
 * @param {object} options - Transcription options
 * @param {string} options.language - Language code or 'auto' for detection (default: 'auto')
 * @param {string} options.task - 'transcribe' or 'translate' to English (default: 'transcribe')
 * @param {string} options.outputDir - Output directory for Whisper files
 * @returns {Promise<{segments: Array, detectedLanguage: string}>}
 */
interface TranscribeOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
  outputDir?: string;
}

interface TranscribeResult {
  segments: { start: number; end: number; speech: string }[];
  detectedLanguage: string;
}

export async function transcribe(audioPath: string, options: TranscribeOptions = {}): Promise<TranscribeResult> {
  const {
    language = "auto",
    task = "transcribe",
    outputDir = path.dirname(audioPath),
  } = options;

  // Verify audio file exists
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found at: ${audioPath}`);
  }

  // Validate task
  if (!["transcribe", "translate"].includes(task)) {
    throw new Error(
      `Invalid task: ${task}. Must be 'transcribe' or 'translate'`
    );
  }

  return new Promise((resolve, reject) => {
    // Check for GPU availability
    const useCuda = checkCudaAvailable();

    // Build whisper command arguments
    const args: string[] = [
      audioPath,
      "--model",
      WHISPER_MODEL,
      "--task",
      task,
      "--output_format",
      "json",
      "--output_dir",
      outputDir,
      "--verbose",
      "False",
    ];

    // Add GPU device if available
    if (useCuda) {
      args.push("--device", "cuda");
    }

    // Only add language flag if not auto-detect
    if (language && language !== "auto") {
      args.push("--language", language);
    }

    console.log(`[Whisper] Running: whisper ${args.join(" ")}`);
    console.log(
      `[Whisper] Model: ${WHISPER_MODEL} | Device: ${useCuda ? "GPU (CUDA)" : "CPU"}`
    );
    console.log(
      `[Whisper] Language: ${language === "auto" ? "Auto-detect" : getLanguageName(language)}`
    );
    console.log(`[Whisper] Task: ${task}`);

    const whisperProcess = spawn("whisper", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    whisperProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    whisperProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      // Log progress lines
      const lines = data.toString().split("\n");
      lines.forEach((line: any) => {
        if (line.trim()) {
          console.log(`[Whisper] ${line}`);
        }
      });
    });

    whisperProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Whisper process exited with code ${code}: ${stderr}`)
        );
        return;
      }

      // Read the JSON output file
      const baseName = path.basename(audioPath, path.extname(audioPath));
      const jsonPath = path.join(outputDir, `${baseName}.json`);

      if (!fs.existsSync(jsonPath)) {
        reject(new Error("Whisper output JSON file not found"));
        return;
      }

      try {
        const jsonContent = fs.readFileSync(jsonPath, "utf-8");
        const result = JSON.parse(jsonContent) as {
          segments?: { start?: number; end?: number; text?: string }[];
          language?: string;
        };

        // Parse segments from Whisper output
        const segments = (result.segments || []).map((seg) => ({
          start: seg.start || 0,
          end: seg.end || 0,
          speech: (seg.text || "").trim(),
        }));

        // Get detected language from Whisper output
        const detectedLanguage = result.language || language;

        console.log(
          `[Whisper] Detected language: ${getLanguageName(detectedLanguage)} (${detectedLanguage})`
        );
        console.log(`[Whisper] Segments generated: ${segments.length}`);

        // Clean up whisper output files (we'll generate our own)
        try {
          fs.unlinkSync(jsonPath);
          // Also clean other potential output files
          const srtPath = path.join(outputDir, `${baseName}.srt`);
          const txtPath = path.join(outputDir, `${baseName}.txt`);
          const vttPath = path.join(outputDir, `${baseName}.vtt`);
          [srtPath, txtPath, vttPath].forEach((f) => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          });
        } catch (e) {
          // Ignore cleanup errors
        }

        resolve({
          segments,
          detectedLanguage,
        });
      } catch (parseError: unknown) {
        reject(
          new Error(`Failed to parse Whisper output: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
        );
      }
    });

    whisperProcess.on("error", (err) => {
      reject(
        new Error(
          `Failed to start Whisper: ${err.message}. Make sure whisper is installed: pip install openai-whisper`
        )
      );
    });
  });
}

/**
 * Transcribe with progress callback (estimated based on audio duration)
 *
 * @param {string} audioPath - Path to audio file
 * @param {number} audioDuration - Duration of audio in seconds
 * @param {function} onProgress - Progress callback (0-100)
 * @param {object} options - Transcription options
 * @returns {Promise<{segments: Array, detectedLanguage: string}>}
 */
export async function transcribeWithProgress(
  audioPath: string,
  audioDuration: number,
  onProgress: (pct: number) => void = () => {},
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  // Estimate transcription time based on audio duration and device
  // GPU is ~10x faster than CPU, base model is ~2x faster than small
  const useCuda = checkCudaAvailable();
  const speedFactor = useCuda ? 0.1 : 0.3; // GPU: ~10x realtime, CPU: ~3x realtime
  const estimatedTime = Math.max(audioDuration * speedFactor, 5); // At least 5 seconds

  let progressInterval: ReturnType<typeof setInterval>;
  let currentProgress = 0;

  // Simulate progress updates during transcription
  progressInterval = setInterval(
    () => {
      currentProgress = Math.min(currentProgress + 2, 95);
      onProgress(currentProgress);
    },
    (estimatedTime * 1000) / 50
  );

  try {
    const result = await transcribe(audioPath, options);
    clearInterval(progressInterval);
    onProgress(100);
    return result;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

/**
 * Get full transcript text without timestamps
 *
 * @param {Array} segments - Transcription segments
 * @returns {string} Full transcript text
 */
export function getFullText(segments: { speech: string }[]): string {
  return segments
    .map((s) => s.speech)
    .join(" ")
    .trim();
}

/**
 * Check if Whisper CLI is available
 *
 * @returns {Promise<boolean>}
 */
export async function checkWhisperCli() {
  return new Promise((resolve) => {
    const proc = spawn("whisper", ["--help"], { stdio: "pipe" });

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 10000);
  });
}

export { WHISPER_MODEL };
