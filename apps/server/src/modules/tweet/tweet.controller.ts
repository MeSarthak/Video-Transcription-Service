import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { tweetService } from './tweet.service.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

export const createTweet = asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body;
  const { user } = req as AuthenticatedRequest;

  const tweet = await tweetService.createTweet(content, user._id);
  ApiResponse.send(res, 201, tweet, 'Tweet created successfully');
});

export const getUserTweets = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const tweets = await tweetService.getUserTweets(userId as string);
  ApiResponse.send(res, 200, tweets, 'User tweets fetched successfully');
});

export const updateTweet = asyncHandler(async (req: Request, res: Response) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const { user } = req as AuthenticatedRequest;

  const tweet = await tweetService.updateTweet(tweetId as string, content, user._id);
  ApiResponse.send(res, 200, tweet, 'Tweet updated successfully');
});

export const deleteTweet = asyncHandler(async (req: Request, res: Response) => {
  const { tweetId } = req.params;
  const { user } = req as AuthenticatedRequest;

  await tweetService.deleteTweet(tweetId as string, user._id);
  ApiResponse.send(res, 200, null, 'Tweet deleted successfully');
});
