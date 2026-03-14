import { Router } from 'express';
import { registerSchema, loginSchema, changePasswordSchema } from '@videotube/shared';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { upload, validateFileSignature } from '../../middlewares/upload.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
} from './auth.controller.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  validateFileSignature,
  validate({ body: registerSchema }),
  register,
);

router.post('/login', authLimiter, validate({ body: loginSchema }), login);

router.post('/logout', verifyJWT, logout);

router.post('/refresh-token', authLimiter, refreshAccessToken);

router.post(
  '/change-password',
  verifyJWT,
  validate({ body: changePasswordSchema }),
  changePassword,
);

router.get('/me', verifyJWT, getCurrentUser);

export { router as authRouter };
