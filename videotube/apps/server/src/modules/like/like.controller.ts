import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { likeService } from './like.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

export const toggleVideoLike = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const result = await likeService.toggleVideoLike(videoId as string, user._id);
  ApiResponse.send(res, 200, result, 'Video like toggled successfully');
});

export const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const result = await likeService.toggleCommentLike(commentId as string, user._id);
  ApiResponse.send(res, 200, result, 'Comment like toggled successfully');
});

export const toggleTweetLike = asyncHandler(async (req: Request, res: Response) => {
  const { tweetId } = req.params;
  const { user } = req as AuthenticatedRequest;

  const result = await likeService.toggleTweetLike(tweetId as string, user._id);
  ApiResponse.send(res, 200, result, 'Tweet like toggled successfully');
});

export const getLikedVideos = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const videos = await likeService.getLikedVideos(user._id);
  ApiResponse.send(res, 200, videos, 'Liked videos fetched successfully');
});
