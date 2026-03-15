import type { z } from 'zod';

// ── Auth ────────────────────────────────────
import type {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../schemas/auth.schema.js';

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ── User ────────────────────────────────────
import type { updateAccountSchema } from '../schemas/user.schema.js';

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

// ── Video ───────────────────────────────────
import type { uploadVideoSchema, getAllVideosSchema } from '../schemas/video.schema.js';

export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;
export type GetAllVideosQuery = z.infer<typeof getAllVideosSchema>;

// ── Comment ─────────────────────────────────
import type { addCommentSchema, updateCommentSchema } from '../schemas/comment.schema.js';

export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// ── Playlist ────────────────────────────────
import type {
  createPlaylistSchema,
  updatePlaylistSchema,
} from '../schemas/playlist.schema.js';

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

// ── Tweet ───────────────────────────────────
import type { createTweetSchema, updateTweetSchema } from '../schemas/tweet.schema.js';

export type CreateTweetInput = z.infer<typeof createTweetSchema>;
export type UpdateTweetInput = z.infer<typeof updateTweetSchema>;

// ── Notification ────────────────────────────
import type { getNotificationsSchema } from '../schemas/notification.schema.js';

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>;

// ── Common ──────────────────────────────────
import type { paginationSchema } from '../schemas/common.schema.js';

export type PaginationQuery = z.infer<typeof paginationSchema>;

// ── Shared utility types ────────────────────

/** Standard API response envelope */
export interface ApiResponsePayload<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

/** Paginated list wrapper */
export interface PaginatedList<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
