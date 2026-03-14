import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { getChannelStats, getChannelVideos } from './dashboard.controller.js';

const router = Router();

router.use(verifyJWT);

router.get('/stats', getChannelStats);
router.get('/videos', getChannelVideos);

export { router as dashboardRouter };
