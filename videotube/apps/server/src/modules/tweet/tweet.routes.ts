import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createTweetSchema, updateTweetSchema } from '@videotube/shared';

import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from './tweet.controller.js';

const router = Router();

router.get('/user/:userId', getUserTweets);

router.post('/', verifyJWT, validate({ body: createTweetSchema }), createTweet);
router.patch('/:tweetId', verifyJWT, validate({ body: updateTweetSchema }), updateTweet);
router.delete('/:tweetId', verifyJWT, deleteTweet);

export { router as tweetRouter };
