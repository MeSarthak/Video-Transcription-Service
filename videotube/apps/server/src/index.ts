/**
 * Server entry point.
 *
 * Boot sequence:
 *   1. Validate env (happens on import of config/env)
 *   2. Connect to MongoDB
 *   3. Ensure temp directory
 *   4. Start HTTP server
 *   5. Graceful shutdown on SIGINT / SIGTERM
 */

import app, { ensureTempDir } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { disconnectRedis } from './config/redis.js';
import { configureCloudinary } from './config/cloudinary.js';
import { logger } from './lib/logger.js';
import type { Server } from 'node:http';

// ── Global error handlers ───────────────────

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

// ── Boot ────────────────────────────────────

let server: Server;

async function bootstrap(): Promise<void> {
  await connectDB();
  configureCloudinary();
  await ensureTempDir();

  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });
}

// ── Graceful shutdown ───────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  await Promise.allSettled([disconnectDB(), disconnectRedis()]);

  logger.info('Cleanup complete — exiting');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Bootstrap failed');
  process.exit(1);
});
