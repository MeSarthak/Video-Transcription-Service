// ── Constants ───────────────────────────────
export {
  DB_NAME,
  VIDEO_STATUS,
  UPLOAD_STATUS,
  SUBTITLE_STATUS,
  SUBTITLE_TASK,
  SUBTITLE_FORMATS,
  VIDEO_VARIANTS,
  LIKE_TARGET_TYPE,
  NOTIFICATION_TYPE,
  NOTIFICATION_REFERENCE_MODEL,
  PAGINATION,
  UPLOAD_LIMITS,
  WATCH_HISTORY_CAP,
  ALLOWED_MIMES,
} from './constants/index.js';

// ── Schemas ─────────────────────────────────
export { objectIdSchema, paginationSchema, sortDirectionSchema } from './schemas/common.schema.js';
export { registerSchema, loginSchema, changePasswordSchema, refreshTokenSchema } from './schemas/auth.schema.js';
export { updateAccountSchema } from './schemas/user.schema.js';
export { uploadVideoSchema, getAllVideosSchema } from './schemas/video.schema.js';
export { addCommentSchema, updateCommentSchema } from './schemas/comment.schema.js';
export { createPlaylistSchema, updatePlaylistSchema } from './schemas/playlist.schema.js';
export { createTweetSchema, updateTweetSchema } from './schemas/tweet.schema.js';
export { getNotificationsSchema } from './schemas/notification.schema.js';

// ── Types ───────────────────────────────────
export type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  RefreshTokenInput,
  UpdateAccountInput,
  UploadVideoInput,
  GetAllVideosQuery,
  AddCommentInput,
  UpdateCommentInput,
  CreatePlaylistInput,
  UpdatePlaylistInput,
  CreateTweetInput,
  UpdateTweetInput,
  GetNotificationsQuery,
  PaginationQuery,
  ApiResponsePayload,
  PaginatedList,
} from './types/index.js';
