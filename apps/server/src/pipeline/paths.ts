/**
 * Absolute-path constants for the server package.
 *
 * Using import.meta.url ensures paths are always resolved relative to THIS
 * file (apps/server/src/pipeline/paths.ts) regardless of the process's
 * working directory — which matters when the monorepo is started from the
 * repo root via `npm run dev --workspace`.
 */

import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";

// Resolves to: <repo>/apps/server/src/pipeline
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves to: <repo>/apps/server
// __dirname = apps/server/src/pipeline  →  ../.. = apps/server
export const SERVER_ROOT = path.resolve(__dirname, "../..");

// Resolves to: <repo>/apps/server/public/temp
export const TEMP_DIR = path.join(SERVER_ROOT, "public", "temp");

// Ensure the temp directory exists at startup
fs.mkdirSync(TEMP_DIR, { recursive: true });
