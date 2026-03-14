import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { userService } from './user.service.js';
import type { AuthenticatedRequest, OptionalAuthRequest } from '../../lib/types.js';
import mongoose from 'mongoose';

// ── Profile / Settings ──────────────────────

export const updateAccountDetails = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { fullname, email } = req.body;

  const updated = await userService.updateAccountDetails(user._id, { fullname, email });

  ApiResponse.send(res, 200, updated, 'Account details updated successfully');
});

export const updateAvatar = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const avatarLocalPath = req.file?.path;

  const updated = await userService.updateAvatar(user._id, avatarLocalPath);

  ApiResponse.send(res, 200, updated, 'Avatar updated successfully');
});

export const updateCoverImage = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const coverImageLocalPath = req.file?.path;

  const updated = await userService.updateCoverImage(user._id, coverImageLocalPath);

  ApiResponse.send(res, 200, updated, 'Cover image updated successfully');
});

// ── Channel ─────────────────────────────────

export const getChannelProfile = asyncHandler(async (req: Request, res: Response) => {
  const username = req.params.username as string;
  const currentUser = (req as OptionalAuthRequest).user;

  const channel = await userService.getChannelProfile(username!, currentUser?._id);

  ApiResponse.send(res, 200, channel, 'Channel profile fetched successfully');
});

// ── Watch history ───────────────────────────

export const addToWatchHistory = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const videoId = req.params.videoId as string;

  const objectId = new mongoose.Types.ObjectId(videoId);
  await userService.addToWatchHistory(user._id, objectId);

  ApiResponse.send(res, 200, null, 'Added to watch history');
});

export const getWatchHistory = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const history = await userService.getWatchHistory(user._id, page, limit);

  ApiResponse.send(res, 200, history, 'Watch history fetched successfully');
});

export const clearWatchHistory = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  await userService.clearWatchHistory(user._id);

  ApiResponse.send(res, 200, null, 'Watch history cleared');
});
