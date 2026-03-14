import { z } from 'zod';
import { PAGINATION } from '../constants/index.js';

/**
 * MongoDB ObjectId string validation.
 * Matches 24-char hex strings.
 */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

/**
 * Pagination query params.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

/**
 * Sort direction.
 */
export const sortDirectionSchema = z.enum(['asc', 'desc']).default('desc');
