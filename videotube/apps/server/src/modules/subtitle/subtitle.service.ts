import mongoose from "mongoose";
import { Video } from "../video/video.model.js";
import { ApiError } from "../../lib/ApiError.js";

const SUPPORTED_LANGUAGES: Record<string, string> = {
  auto: "Auto-detect",
  af: "Afrikaans",
  am: "Amharic",
  ar: "Arabic",
  as: "Assamese",
  az: "Azerbaijani",
  ba: "Bashkir",
  be: "Belarusian",
  bg: "Bulgarian",
  bn: "Bengali",
  bo: "Tibetan",
  br: "Breton",
  bs: "Bosnian",
  ca: "Catalan",
  cs: "Czech",
  cy: "Welsh",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  eu: "Basque",
  fa: "Persian",
  fi: "Finnish",
  fo: "Faroese",
  fr: "French",
  gl: "Galician",
  gu: "Gujarati",
  ha: "Hausa",
  haw: "Hawaiian",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  ht: "Haitian Creole",
  hu: "Hungarian",
  hy: "Armenian",
  id: "Indonesian",
  is: "Icelandic",
  it: "Italian",
  ja: "Japanese",
  jw: "Javanese",
  ka: "Georgian",
  kk: "Kazakh",
  km: "Khmer",
  kn: "Kannada",
  ko: "Korean",
  la: "Latin",
  lb: "Luxembourgish",
  ln: "Lingala",
  lo: "Lao",
  lt: "Lithuanian",
  lv: "Latvian",
  mg: "Malagasy",
  mi: "Maori",
  mk: "Macedonian",
  ml: "Malayalam",
  mn: "Mongolian",
  mr: "Marathi",
  ms: "Malay",
  mt: "Maltese",
  my: "Myanmar",
  ne: "Nepali",
  nl: "Dutch",
  nn: "Nynorsk",
  no: "Norwegian",
  oc: "Occitan",
  pa: "Punjabi",
  pl: "Polish",
  ps: "Pashto",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sa: "Sanskrit",
  sd: "Sindhi",
  si: "Sinhala",
  sk: "Slovak",
  sl: "Slovenian",
  sn: "Shona",
  so: "Somali",
  sq: "Albanian",
  sr: "Serbian",
  su: "Sundanese",
  sv: "Swedish",
  sw: "Swahili",
  ta: "Tamil",
  te: "Telugu",
  tg: "Tajik",
  th: "Thai",
  tk: "Turkmen",
  tl: "Tagalog",
  tr: "Turkish",
  tt: "Tatar",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  vi: "Vietnamese",
  yi: "Yiddish",
  yo: "Yoruba",
  yue: "Cantonese",
  zh: "Chinese",
};

export function validateLanguage(language: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, language);
}

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code] || "Unknown";
}

export function getLanguageCount(): number {
  return Object.keys(SUPPORTED_LANGUAGES).length;
}

class SubtitleService {
  getSupportedLanguages() {
    return {
      languages: SUPPORTED_LANGUAGES,
      count: getLanguageCount(),
      tasks: {
        transcribe: "Transcribe audio in original language",
        translate: "Transcribe and translate to English",
      },
    };
  }

  async getSubtitleInfo(videoId: string) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId).select("subtitles title owner");

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    return {
      videoId: video._id,
      title: video.title,
      subtitles: video.subtitles,
    };
  }

  async getSubtitleFile(videoId: string, format: string) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const validFormats = ["srt", "vtt", "json", "txt"];
    if (!validFormats.includes(format)) {
      throw new ApiError(
        400,
        `Invalid format. Supported formats: ${validFormats.join(", ")}`
      );
    }

    const video = await Video.findById(videoId).select("subtitles title");

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    if (video.subtitles?.status !== "completed") {
      throw new ApiError(
        400,
        `Subtitles not available. Status: ${video.subtitles?.status}`
      );
    }

    const fileUrl = video.subtitles?.files?.[format as keyof typeof video.subtitles.files];

    if (!fileUrl) {
      throw new ApiError(404, `Subtitle file in ${format} format not found`);
    }

    return {
      videoId: video._id,
      title: video.title,
      format,
      url: fileUrl,
      language: video.subtitles.detectedLanguage,
    };
  }

  async regenerateSubtitles(
    videoId: string,
    userId: string,
    options: { language?: string; task?: string } = {}
  ) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to modify this video");
    }

    if (video.status !== "published") {
      throw new ApiError(
        400,
        `Cannot regenerate subtitles. Video status: ${video.status}`
      );
    }

    const language = options.language || "auto";
    if (!validateLanguage(language)) {
      throw new ApiError(400, `Unsupported language: ${language}`);
    }

    const task = options.task || "transcribe";
    if (!["transcribe", "translate"].includes(task)) {
      throw new ApiError(400, 'Invalid task. Use "transcribe" or "translate"');
    }

    if (video.subtitles?.status === "processing") {
      throw new ApiError(400, "Subtitle regeneration already in progress");
    }

    await Video.findByIdAndUpdate(videoId, {
      "subtitles.status": "pending",
      "subtitles.language": language,
      "subtitles.task": task,
      "subtitles.errorMessage": null,
    });

    throw new ApiError(
      501,
      "Subtitle regeneration requires access to the original video file. " +
        "This feature is planned for a future release where we'll store a reference " +
        "to the source video or allow re-upload for regeneration."
    );
  }
}

export const subtitleService = new SubtitleService();
