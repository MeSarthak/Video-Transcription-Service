import { Router } from 'express';
import { verifyJWT, optionalVerifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { upload, validateFileSignature } from '../../middlewares/upload.middleware.js';
import { uploadVideoSchema, getAllVideosSchema } from '@videotube/shared';
import { uploadLimiter, viewsLimiter } from '../../middlewares/rateLimiter.middleware.js';

import {
  uploadHLSVideo,
  getVideoStatus,
  getAllVideos,
  getVideoById,
  getRelatedVideos,
  incrementViewCount,
} from './video.controller.js';
import { videoSubtitleRouter } from '../subtitle/subtitle.routes.js';

const router = Router();

// ── Subtitle Router ─────────────────────────
router.use('/:videoId/subtitles', videoSubtitleRouter);

// ── Upload (Auth) ───────────────────────────
router.post(
  '/upload',
  verifyJWT,
  uploadLimiter,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  validateFileSignature,
  validate({ body: uploadVideoSchema }),
  uploadHLSVideo,
);

// ── Status (Auth) ───────────────────────────
router.get('/status/:videoId', verifyJWT, getVideoStatus);

// ── Public Routes ───────────────────────────
router.get('/', validate({ query: getAllVideosSchema }), getAllVideos);
router.get('/:videoId', optionalVerifyJWT, getVideoById);
router.get('/:videoId/related', getRelatedVideos);

// ── Actions ─────────────────────────────────
router.patch('/:videoId/views', viewsLimiter, incrementViewCount);

export { router as videoRouter };
