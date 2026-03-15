import { Router } from 'express';
import { verifyJWT, optionalVerifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { upload, validateFileSignature } from '../../middlewares/upload.middleware.js';
import { updateAccountSchema } from '@videotube/shared';
import { userLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getChannelProfile,
  addToWatchHistory,
  getWatchHistory,
  clearWatchHistory,
} from './user.controller.js';

const router = Router();

// ── Profile / Settings (authenticated) ──────
router.patch(
  '/update-account',
  verifyJWT,
  validate({ body: updateAccountSchema }),
  updateAccountDetails,
);

router.patch(
  '/avatar',
  verifyJWT,
  userLimiter,
  upload.single('avatar'),
  validateFileSignature,
  updateAvatar,
);

router.patch(
  '/cover-image',
  verifyJWT,
  userLimiter,
  upload.single('coverImage'),
  validateFileSignature,
  updateCoverImage,
);

// ── Channel (public, optionally authenticated) ──
router.get('/channel/:username', optionalVerifyJWT, getChannelProfile);

// ── Watch history (authenticated) ───────────
router.get('/watch-history', verifyJWT, getWatchHistory);
router.post('/watch-history/:videoId', verifyJWT, addToWatchHistory);
router.delete('/watch-history', verifyJWT, clearWatchHistory);

export { router as userRouter };
