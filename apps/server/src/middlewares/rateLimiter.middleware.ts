import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * General API rate limiter.
 * 100 req / 15 min per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/v1/health',
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Auth endpoints — strict.
 * 5 req / 15 min per IP. Only counts failures.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
});

/**
 * File upload limiter.
 * 10 req / hour per IP.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Read operations — loose.
 * 500 GET requests / 15 min per IP.
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many read requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'GET',
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Per-user limiter.
 * 1000/hr for authenticated, 500/hr for anonymous.
 */
export const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: (req: Request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req as any).user ? 1000 : 500;
  },
  message: 'Rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (req as any).user as
      | { _id: { toString(): string } }
      | undefined;
    if (user?._id) return user._id.toString();
    return req.ip ?? 'unknown';
  },
  validate: { keyGeneratorIpFallback: false },
});

/**
 * View-count inflation prevention.
 * 1 view per IP per video per minute.
 */
export const viewsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: 'You can only increment view count once per minute per video.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const videoId = req.params.videoId ?? req.originalUrl;
    return `${req.ip ?? 'unknown'}-${videoId}`;
  },
  validate: { keyGeneratorIpFallback: false },
});
