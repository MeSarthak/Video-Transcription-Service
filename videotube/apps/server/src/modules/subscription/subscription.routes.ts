import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from './subscription.controller.js';

const router = Router();

router.use(verifyJWT);

router.post('/c/:channelId', toggleSubscription);
router.get('/c/:channelId', getUserChannelSubscribers);
router.get('/u/:subscriberId', getSubscribedChannels);

export { router as subscriptionRouter };
