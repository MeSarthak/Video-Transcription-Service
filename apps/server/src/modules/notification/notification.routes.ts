import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { getNotificationsSchema } from '@videotube/shared';

import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './notification.controller.js';

const router = Router();

router.use(verifyJWT);

router.get('/', validate({ query: getNotificationsSchema }), getUserNotifications);
router.get('/unread-count', getUnreadCount);

router.patch('/:notificationId/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export { router as notificationRouter };
