import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/**
 * Central error-handling middleware.
 * Must be registered LAST with `app.use(errorHandler)`.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ─────────────────
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    res.status(400).json({
      statusCode: 400,
      data: null,
      message: 'Validation failed',
      success: false,
      errors,
    });
    return;
  }

  // ── Known operational errors ──────────────
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      data: err.data,
      message: err.message,
      success: err.success,
      errors: err.errors,
    });
    return;
  }

  // ── Unexpected errors ─────────────────────
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error({ err: error }, 'Unhandled error');

  res.status(500).json({
    statusCode: 500,
    data: null,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    success: false,
    errors: [],
  });
}
