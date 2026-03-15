import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { commentService } from './comment.service.js';
import type { AuthenticatedRequest, OptionalAuthRequest } from '../../lib/types.js';

export const getVideoComments = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const currentUser = (req as OptionalAuthRequest).user;

  const comments = await commentService.getVideoComments(videoId, page, Math.min(100, limit), currentUser?._id);

  ApiResponse.send(res, 200, comments, 'Comments fetched successfully');
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const videoId = req.params.videoId as string;
  const { user } = req as AuthenticatedRequest;
  const { content } = req.body;

  const comment = await commentService.addComment(videoId, user._id, content);

  ApiResponse.send(res, 201, comment, 'Comment added successfully');
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const commentId = req.params.commentId as string;
  const { user } = req as AuthenticatedRequest;
  const { content } = req.body;

  const comment = await commentService.updateComment(commentId, user._id, content);

  ApiResponse.send(res, 200, comment, 'Comment updated successfully');
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const commentId = req.params.commentId as string;
  const { user } = req as AuthenticatedRequest;

  await commentService.deleteComment(commentId, user._id);

  ApiResponse.send(res, 200, null, 'Comment deleted successfully');
});
