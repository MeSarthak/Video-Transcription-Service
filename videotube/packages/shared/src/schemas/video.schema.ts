import { z } from 'zod';
import { SUBTITLE_TASK } from '../constants/index.js';

export const uploadVideoSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description cannot exceed 5000 characters')
    .default('No description')
    .transform((v) => v.trim()),
  subtitleLanguage: z.string().default('auto'),
  subtitleTask: z
    .enum([SUBTITLE_TASK.TRANSCRIBE, SUBTITLE_TASK.TRANSLATE])
    .default(SUBTITLE_TASK.TRANSCRIBE),
});

export const getAllVideosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  query: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'views', 'duration', 'mostLiked', 'mostViewed'])
    .default('createdAt'),
  sortType: z.enum(['asc', 'desc']).default('desc'),
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    .optional(),
  tags: z.string().optional(),
  uploadDate: z.enum(['today', 'week', 'month', 'year']).optional(),
  durationMin: z.coerce.number().min(0).optional(),
  durationMax: z.coerce.number().min(0).optional(),
});
