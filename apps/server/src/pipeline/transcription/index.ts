/**
 * Transcription Module
 * Barrel file exporting all transcription-related utilities
 */

// Language utilities
export {
  SUPPORTED_LANGUAGES,
  validateLanguage,
  getLanguageName,
  getLanguageCount,
} from "./languages.js";

// Time formatting utilities
export {
  secondsToSrtTime,
  secondsToVttTime,
  padZero,
  formatFileSize,
  formatDuration,
  sanitizeFilename,
} from "./formatters.js";

// Audio extraction
export {
  extractAudio,
  getMediaDuration,
  getMediaInfo,
  checkFfmpeg,
} from "./audioExtractor.js";

// Whisper transcription
export {
  transcribe,
  transcribeWithProgress,
  getFullText,
  checkWhisperCli,
  checkCudaAvailable,
  WHISPER_MODEL,
} from "./transcriber.js";

// Subtitle generation
export {
  generateSrt,
  generateVtt,
  generateJson,
  generateTxt,
  saveSubtitleFile,
  generateAllFormats,
} from "./subtitleGenerator.js";
