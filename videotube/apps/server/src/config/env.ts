import { z } from 'zod';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load .env relative to apps/server/ so this works regardless of the CWD
// (npm workspaces runs scripts from the repo root, not the package root).
// This must happen before the Zod parse below.
config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

/**
 * Zod schema for all environment variables.
 * Validated at startup — fails fast if anything is missing/wrong.
 */
const envSchema = z.object({
  // ── App ───────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  CORS_ORIGIN: z.string().default('*'),

  // ── MongoDB ───────────────────────────────
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URI'),

  // ── Redis ─────────────────────────────────
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_CA: z.string().optional(),

  // ── JWT ───────────────────────────────────
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('1d'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  REFRESH_TOKEN_EXPIRY: z.string().default('10d'),

  // ── Cloudinary ────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // ── Azure Blob Storage ────────────────────
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  STORAGE_ACCOUNT_NAME: z.string().min(1),
  CONTAINER_NAME: z.string().default('videos'),
  SAS_TOKEN: z.string().optional(),

  // ── Whisper (transcription) ───────────────
  WHISPER_MODEL: z
    .enum(['tiny', 'base', 'small', 'medium', 'large'])
    .default('base'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate process.env.
 * Call once at startup; throws ZodError if invalid.
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
