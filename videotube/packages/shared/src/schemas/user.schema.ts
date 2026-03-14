import { z } from 'zod';

export const updateAccountSchema = z.object({
  fullname: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});
