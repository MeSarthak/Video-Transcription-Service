import { z } from 'zod';

export const createTweetSchema = z.object({
  content: z
    .string()
    .min(1, 'Tweet cannot be empty')
    .max(500, 'Tweet cannot exceed 500 characters')
    .trim(),
});

export const updateTweetSchema = z.object({
  content: z
    .string()
    .min(1, 'Tweet cannot be empty')
    .max(500, 'Tweet cannot exceed 500 characters')
    .trim(),
});
