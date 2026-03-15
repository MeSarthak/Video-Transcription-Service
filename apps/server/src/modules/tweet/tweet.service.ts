import mongoose, { type Types } from 'mongoose';
import { Tweet } from './tweet.model.js';
import { ApiError } from '../../lib/ApiError.js';
import { Like } from '../like/like.model.js';

class TweetService {
  async createTweet(content: string, ownerId: Types.ObjectId) {
    if (!content) throw new ApiError(400, 'Content is required');
    return Tweet.create({ content, owner: ownerId });
  }

  async getUserTweets(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid User ID');
    }

    return Tweet.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerDetails',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $addFields: { owner: { $first: '$ownerDetails' } } },
      { $project: { ownerDetails: 0 } },
    ]);
  }

  async updateTweet(tweetId: string, content: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, 'Invalid Tweet ID');
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, 'Tweet not found');

    if (String(tweet.owner) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized to update this tweet');
    }

    tweet.content = content;
    await tweet.save();

    return tweet;
  }

  async deleteTweet(tweetId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      throw new ApiError(400, 'Invalid Tweet ID');
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, 'Tweet not found');

    if (String(tweet.owner) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized to delete this tweet');
    }

    await Tweet.findByIdAndDelete(tweetId);

    // Also clean up likes
    await Like.deleteMany({ targetType: 'tweet', targetId: tweetId });

    return { deleted: true };
  }
}

export const tweetService = new TweetService();
