import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'node:fs/promises';
import { UPLOAD_LIMITS } from '@videotube/shared';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';

// ── Temp directory ──────────────────────────

export async function ensureTempDir(): Promise<void> {
  const tempDir = './public/temp';
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {
    logger.error({ err, tempDir }, 'Failed to create temp directory');
  }
}

// ── CORS origin validation ──────────────────

function getCorsOrigin(): string | boolean {
  const origin = env.CORS_ORIGIN;

  if (!origin) {
    logger.warn('No CORS_ORIGIN configured — using permissive setting');
    return env.NODE_ENV === 'production' ? false : '*';
  }

  if (origin === '*' && env.NODE_ENV === 'production') {
    logger.fatal('Wildcard CORS_ORIGIN is not allowed in production');
    process.exit(1);
  }

  return origin;
}

import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { videoRouter } from './modules/video/video.routes.js';
import { commentRouter } from './modules/comment/comment.routes.js';
import { likeRouter } from './modules/like/like.routes.js';
import { subscriptionRouter } from './modules/subscription/subscription.routes.js';
import { playlistRouter } from './modules/playlist/playlist.routes.js';
import { tweetRouter } from './modules/tweet/tweet.routes.js';
import { notificationRouter } from './modules/notification/notification.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { subtitleRouter } from './modules/subtitle/subtitle.routes.js';
import { sasTokenRoutes } from './modules/sas-token/sas-token.routes.js';

// ── Express app ─────────────────────────────

const app = express();

app.use(
  cors({
    origin: getCorsOrigin(),
    credentials: true,
  }),
);

app.use(express.json({ limit: UPLOAD_LIMITS.JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: UPLOAD_LIMITS.JSON_BODY_LIMIT }));
app.use(express.static('public'));
app.use(cookieParser());

// Global rate limiter
app.use(generalLimiter);

// ── Health check ────────────────────────────

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: 'API is running',
    success: true,
  });
});

// ──────────────────────────────────────────────
app.use('/api/v1/auth',          authRouter);
app.use('/api/v1/users',         userRouter);
app.use('/api/v1/videos',        videoRouter);
app.use('/api/v1/comments',      commentRouter);
app.use('/api/v1/likes',         likeRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/playlists',     playlistRouter);
app.use('/api/v1/tweets',        tweetRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/dashboard',     dashboardRouter);
app.use('/api/v1/subtitles',     subtitleRouter);
app.use('/api/v1/sas-tokens',    sasTokenRoutes);
// ──────────────────────────────────────────────

// ── Error handling (must be last) ───────────

app.use(errorHandler);

app.use((_req, res) => {
  res.status(404).json({
    statusCode: 404,
    message: 'Route not found',
    success: false,
  });
});

export default app;
