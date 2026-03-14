import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { dashboardService } from './dashboard.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

export const getChannelStats = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const stats = await dashboardService.getChannelStats(user._id);
  ApiResponse.send(res, 200, stats, 'Channel stats fetched successfully');
});

export const getChannelVideos = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const videos = await dashboardService.getChannelVideos(user._id);
  ApiResponse.send(res, 200, videos, 'Channel videos fetched successfully');
});
