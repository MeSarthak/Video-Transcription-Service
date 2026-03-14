import mongoose, { type Types } from 'mongoose';
import { User } from './user.model.js';
import { Subscription } from '../subscription/subscription.model.js';
import { uploadOnCloudinary } from '../../config/cloudinary.js';
import { ApiError } from '../../lib/ApiError.js';
import { WATCH_HISTORY_CAP } from '@videotube/shared';

class UserService {
  // ── Profile / Settings ──────────────────────

  async updateAccountDetails(
    userId: Types.ObjectId,
    data: { fullname: string; email: string },
  ) {
    // Check for duplicate email on a different user
    const existing = await User.findOne({ email: data.email });
    if (existing && !existing._id.equals(userId)) {
      throw new ApiError(409, 'Email already in use');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { fullname: data.fullname, email: data.email } },
      { new: true },
    ).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  async updateAvatar(userId: Types.ObjectId, avatarLocalPath?: string) {
    if (!avatarLocalPath) {
      throw new ApiError(400, 'Avatar image is required');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, 'Avatar upload failed');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: avatar.url } },
      { new: true },
    ).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  async updateCoverImage(userId: Types.ObjectId, coverImageLocalPath?: string) {
    if (!coverImageLocalPath) {
      throw new ApiError(400, 'Cover image is required');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage) {
      throw new ApiError(500, 'Cover image upload failed');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { coverImage: coverImage.url } },
      { new: true },
    ).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  }

  // ── Channel profile (public) ────────────────

  async getChannelProfile(username: string, currentUserId?: Types.ObjectId): Promise<Record<string, any>> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      throw new ApiError(400, 'Username is required');
    }

    const user = await User.findOne({ username: trimmed })
      .select('fullname username avatar coverImage subscribersCount subscribedToCount email')
      .lean();

    if (!user) {
      throw new ApiError(404, 'Channel not found');
    }

    // Check if the current user is subscribed
    let isSubscribed = false;
    if (currentUserId) {
      const sub = await Subscription.exists({
        subscriber: currentUserId,
        channel: user._id,
      });
      isSubscribed = !!sub;
    }

    return { ...user, isSubscribed };
  }

  // ── Watch history ───────────────────────────

  /**
   * Add a video to the user's watch history.
   * Uses $push with $slice to cap at WATCH_HISTORY_CAP.
   * Also removes any existing entry for the same video first
   * so it moves to the end (most recent).
   */
  async addToWatchHistory(userId: Types.ObjectId, videoId: Types.ObjectId) {
    // Remove old entry for this video (if any) so we don't have duplicates
    await User.updateOne(
      { _id: userId },
      { $pull: { watchHistory: { video: videoId } } },
    );

    // Push new entry at the end, capped
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          watchHistory: {
            $each: [{ video: videoId, watchedAt: new Date() }],
            $slice: -WATCH_HISTORY_CAP,
          },
        },
      },
    );
  }

  /**
   * Get paginated watch history.
   * Uses aggregation to unwind, paginate, then lookup video + owner.
   */
  async getWatchHistory(
    userId: Types.ObjectId,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const result = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(String(userId)) } },

      // Reverse so most recent first
      {
        $project: {
          watchHistory: { $reverseArray: '$watchHistory' },
        },
      },

      // Facet for total count + paginated data
      {
        $facet: {
          metadata: [
            { $project: { total: { $size: '$watchHistory' } } },
          ],
          data: [
            { $unwind: '$watchHistory' },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'videos',
                localField: 'watchHistory.video',
                foreignField: '_id',
                as: 'videoDetails',
                pipeline: [
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'owner',
                      foreignField: '_id',
                      as: 'owner',
                      pipeline: [
                        { $project: { fullname: 1, username: 1, avatar: 1 } },
                      ],
                    },
                  },
                  {
                    $addFields: { owner: { $first: '$owner' } },
                  },
                ],
              },
            },
            {
              $project: {
                video: { $first: '$videoDetails' },
                watchedAt: '$watchHistory.watchedAt',
              },
            },
          ],
        },
      },
    ]);

    const total = result[0]?.metadata[0]?.total ?? 0;
    const history = result[0]?.data ?? [];

    return {
      docs: history,
      totalDocs: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    };
  }

  async clearWatchHistory(userId: Types.ObjectId) {
    await User.updateOne({ _id: userId }, { $set: { watchHistory: [] } });
  }
}

export const userService = new UserService();
