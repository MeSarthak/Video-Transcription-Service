// ──────────────────────────────────────────
// Database
// ──────────────────────────────────────────
export const DB_NAME = 'videotube';

// ──────────────────────────────────────────
// Video
// ──────────────────────────────────────────
export const VIDEO_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  FAILED: 'failed',
} as const;

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const SUBTITLE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DISABLED: 'disabled',
} as const;

export const SUBTITLE_TASK = {
  TRANSCRIBE: 'transcribe',
  TRANSLATE: 'translate',
} as const;

export const SUBTITLE_FORMATS = ['srt', 'vtt', 'json', 'txt'] as const;

export const VIDEO_VARIANTS = ['360p', '480p', '720p', '1080p'] as const;

// ──────────────────────────────────────────
// Like
// ──────────────────────────────────────────
export const LIKE_TARGET_TYPE = {
  VIDEO: 'video',
  COMMENT: 'comment',
  TWEET: 'tweet',
} as const;

// ──────────────────────────────────────────
// Notification
// ──────────────────────────────────────────
export const NOTIFICATION_TYPE = {
  VIDEO_LIKE: 'VIDEO_LIKE',
  COMMENT_LIKE: 'COMMENT_LIKE',
  TWEET_LIKE: 'TWEET_LIKE',
  COMMENT: 'COMMENT',
  SUBSCRIBE: 'SUBSCRIBE',
} as const;

export const NOTIFICATION_REFERENCE_MODEL = {
  VIDEO: 'Video',
  COMMENT: 'Comment',
  TWEET: 'Tweet',
  USER: 'User',
} as const;

// ──────────────────────────────────────────
// Pagination defaults
// ──────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ──────────────────────────────────────────
// Upload limits
// ──────────────────────────────────────────
export const UPLOAD_LIMITS = {
  VIDEO_MAX_SIZE: 500 * 1024 * 1024, // 500MB
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  JSON_BODY_LIMIT: '16kb',
} as const;

// ──────────────────────────────────────────
// Watch history
// ──────────────────────────────────────────
export const WATCH_HISTORY_CAP = 200;

// ──────────────────────────────────────────
// Allowed MIME types
// ──────────────────────────────────────────
export const ALLOWED_MIMES = {
  VIDEO: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
