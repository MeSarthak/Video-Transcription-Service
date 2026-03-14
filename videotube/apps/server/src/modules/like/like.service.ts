import mongoose, { type Types } from 'mongoose';
import { Like } from './like.model.js';
import { Video } from '../video/video.model.js';
import { Comment } from '../comment/comment.model.js';
import { Tweet } from '../tweet/tweet.model.js';
import { ApiError } from '../../lib/ApiError.js';

class LikeService {
  async toggleVideoLike(videoId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid video ID format');
    }

    const targetId = new mongoose.Types.ObjectId(videoId);
    const video = await Video.findById(targetId);
    if (!video) throw new ApiError(404, 'Video not found');

    const deleted = await Like.findOneAndDelete({
      targetType: 'video',
      targetId,
      likedBy: userId,
    });

    if (deleted) {
      const updated = await Video.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } }, { new: true });
      return { liked: false, likesCount: updated?.likesCount ?? 0 };
    }

    try {
      await Like.create({ targetType: 'video', targetId, likedBy: userId });
      const updated = await Video.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } }, { new: true });
      return { liked: true, likesCount: updated?.likesCount ?? 0 };
    } catch (err: any) {
      if (err.code === 11000) {
        const video = await Video.findById(targetId);
        return { liked: true, likesCount: video?.likesCount ?? 0 };
      }
      throw err;
    }

    // notificationService logic to be connected later if needed
  }

  async toggleCommentLike(commentId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, 'Invalid comment ID format');
    }

    const targetId = new mongoose.Types.ObjectId(commentId);
    const comment = await Comment.findById(targetId);
    if (!comment) throw new ApiError(404, 'Comment not found');

    const deleted = await Like.findOneAndDelete({
      targetType: 'comment',
      targetId,
      likedBy: userId,
    });

    if (deleted) {
      await Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
      return { liked: false };
    }

    try {
      await Like.create({ targetType: 'comment', targetId, likedBy: userId });
      await Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
    } catch (err: any) {
      if (err.code === 11000) return { liked: true };
      throw err;
    }

    return { liked: true };
  }

  async toggleTweetLike(tweetId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, 'Invalid tweet ID format');
    }

    const targetId = new mongoose.Types.ObjectId(tweetId);
    const tweet = await Tweet.findById(targetId);
    if (!tweet) throw new ApiError(404, 'Tweet not found');

    const deleted = await Like.findOneAndDelete({
      targetType: 'tweet',
      targetId,
      likedBy: userId,
    });

    if (deleted) {
      await Tweet.findByIdAndUpdate(targetId, { $inc: { likesCount: -1 } });
      return { liked: false };
    }

    try {
      await Like.create({ targetType: 'tweet', targetId, likedBy: userId });
      await Tweet.findByIdAndUpdate(targetId, { $inc: { likesCount: 1 } });
    } catch (err: any) {
      if (err.code === 11000) return { liked: true };
      throw err;
    }

    return { liked: true };
  }

  async getLikedVideos(userId: Types.ObjectId) {
    return Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(String(userId)),
          targetType: 'video',
        },
      },
      {
        $lookup: {
          from: 'videos',
          localField: 'targetId',
          foreignField: '_id',
          as: 'video',
          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
              },
            },
            {
              $addFields: { owner: { $first: '$owner' } },
            },
          ],
        },
      },
      { $unwind: '$video' },
      { $project: { video: 1, createdAt: 1 } },
      { $sort: { createdAt: -1 } }
    ]);
  }
}

export const likeService = new LikeService();
