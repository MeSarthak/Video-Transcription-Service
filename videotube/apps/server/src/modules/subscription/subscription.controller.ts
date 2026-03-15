import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { subscriptionService } from './subscription.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';
import { paginationSchema } from '@videotube/shared';

export const toggleSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const result = await subscriptionService.toggleSubscription(channelId as string, user._id);
  ApiResponse.send(res, 200, result, 'Subscription toggled successfully');
});

export const getUserChannelSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const { page, limit } = paginationSchema.parse(req.query);

  const subscribers = await subscriptionService.getUserChannelSubscribers(channelId as string, page, limit);
  ApiResponse.send(res, 200, subscribers, 'Subscribers fetched successfully');
});

export const getSubscribedChannels = asyncHandler(async (req: Request, res: Response) => {
  const { subscriberId } = req.params;
  const { user } = req as AuthenticatedRequest;

  if (String(user._id) !== subscriberId) {
    return ApiResponse.send(res, 403, null, 'You can only view your own subscribed channels');
  }

  const channels = await subscriptionService.getSubscribedChannels(subscriberId as string);
  ApiResponse.send(res, 200, channels, 'Subscribed channels fetched successfully');
});
