import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { videoService } from './video.service.js';
import type { AuthenticatedRequest, OptionalAuthRequest } from '../../lib/types.js';
import { ApiError } from '../../lib/ApiError.js';

export const uploadHLSVideo = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { title, description, subtitleLanguage, subtitleTask } = req.body;

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const videoFile = files?.video?.[0] || req.file;

  if (!videoFile) {
    throw new ApiError(400, 'Video file is required');
  }

  const video = await videoService.uploadHLSVideo({
    file: videoFile,
    title,
    description: description || 'No description',
    ownerId: user._id,
    subtitleLanguage: subtitleLanguage || 'auto',
    subtitleTask: subtitleTask || 'transcribe',
  });

  ApiResponse.send(res, 202, { videoId: video._id, status: 'pending' }, 'Video queued for processing');
});

export const getVideoStatus = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  const status = await videoService.getVideoStatus(videoId);
  ApiResponse.send(res, 200, status, 'Video status fetched successfully');
});

export const getAllVideos = asyncHandler(async (req: Request, res: Response) => {
  const result = await videoService.getAllVideos(req.query as any);
  ApiResponse.send(res, 200, result, 'Videos fetched successfully');
});

export const getVideoById = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  const currentUser = (req as OptionalAuthRequest).user;

  const video = await videoService.getVideoById(videoId, currentUser?._id);
  ApiResponse.send(res, 200, video, 'Video fetched successfully');
});

export const getRelatedVideos = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  const limit = parseInt((req.query.limit as string) || '10', 10);

  const videos = await videoService.getRelatedVideos(videoId, limit);
  ApiResponse.send(res, 200, videos, 'Related videos fetched successfully');
});

export const incrementViewCount = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  await videoService.incrementViewCount(videoId);
  ApiResponse.send(res, 200, null, 'View count incremented');
});
