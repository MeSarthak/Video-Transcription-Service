import mongoose, { type Types } from 'mongoose';
import { Subscription } from './subscription.model.js';
import { User } from '../user/user.model.js';
import { ApiError } from '../../lib/ApiError.js';

class SubscriptionService {
  async toggleSubscription(channelId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, 'Invalid channel ID format');
    }

    if (channelId === String(userId)) {
      throw new ApiError(400, 'You cannot subscribe to your own channel');
    }

    const channelObjId = new mongoose.Types.ObjectId(channelId);
    const channel = await User.findById(channelObjId);

    if (!channel) {
      throw new ApiError(404, 'Channel not found');
    }

    const deleted = await Subscription.findOneAndDelete({
      subscriber: userId,
      channel: channelObjId,
    });

    if (deleted) {
      // decrement counters
      await User.findByIdAndUpdate(channelObjId, { $inc: { subscribersCount: -1 } });
      await User.findByIdAndUpdate(userId, { $inc: { subscribedToCount: -1 } });
      return { subscribed: false };
    }

    try {
      await Subscription.create({ subscriber: userId, channel: channelObjId });
      // increment counters
      await User.findByIdAndUpdate(channelObjId, { $inc: { subscribersCount: 1 } });
      await User.findByIdAndUpdate(userId, { $inc: { subscribedToCount: 1 } });
    } catch (err: any) {
      if (err.code === 11000) return { subscribed: true };
      throw err;
    }

    // notification logic can be integrated here later
    return { subscribed: true };
  }

  async getUserChannelSubscribers(channelId: string) {
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, 'Invalid channel ID format');
    }

    return Subscription.aggregate([
      { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'subscriber',
          foreignField: '_id',
          as: 'subscriber',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $addFields: { subscriber: { $first: '$subscriber' } } },
    ]);
  }

  async getSubscribedChannels(subscriberId: string) {
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
      throw new ApiError(400, 'Invalid subscriber ID format');
    }

    return Subscription.aggregate([
      { $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'channel',
          foreignField: '_id',
          as: 'channel',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $addFields: { channel: { $first: '$channel' } } },
    ]);
  }
}

export const subscriptionService = new SubscriptionService();
