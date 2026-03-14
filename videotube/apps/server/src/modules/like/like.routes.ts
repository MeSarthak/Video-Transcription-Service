import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
} from './like.controller.js';

const router = Router();

// All like routes require auth
router.use(verifyJWT);

router.post('/toggle/v/:videoId', toggleVideoLike);
router.post('/toggle/c/:commentId', toggleCommentLike);
router.post('/toggle/t/:tweetId', toggleTweetLike);

router.get('/videos', getLikedVideos);

export { router as likeRouter };
