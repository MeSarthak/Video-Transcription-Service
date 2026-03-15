import { z } from 'zod';
import { NOTIFICATION_TYPE } from '../constants/index.js';
import { paginationSchema } from './common.schema.js';

const notificationTypes = Object.values(NOTIFICATION_TYPE) as [string, ...string[]];

/**
 * Query params for fetching notifications.
 */
export const getNotificationsSchema = paginationSchema.extend({
  type: z.enum(notificationTypes).optional(),
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
