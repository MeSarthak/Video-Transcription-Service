import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { notificationService } from './notification.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '10', 10);
  
  const type = req.query.type as string | undefined;
  const isReadParam = req.query.isRead as string | undefined;
  let isRead: boolean | undefined;
  if (isReadParam !== undefined) {
    isRead = isReadParam === 'true';
  }

  const notifications = await notificationService.getUserNotifications(user._id, page, limit, { type, isRead });

  ApiResponse.send(res, 200, notifications, 'Notifications fetched successfully');
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const count = await notificationService.getUnreadCount(user._id);

  ApiResponse.send(res, 200, count, 'Unread count fetched successfully');
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { notificationId } = req.params;

  const notification = await notificationService.markAsRead(notificationId as string, user._id);
  ApiResponse.send(res, 200, notification, 'Notification marked as read');
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  await notificationService.markAllAsRead(user._id);
  ApiResponse.send(res, 200, null, 'All notifications marked as read');
});
