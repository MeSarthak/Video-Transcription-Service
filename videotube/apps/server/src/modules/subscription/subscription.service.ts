import mongoose, { type Types } from 'mongoose';
import { Subscription } from './subscription.model.js';
import { User } from '../user/user.model.js';
import { ApiError } from '../../lib/ApiError.js';
import { notificationService } from '../notification/notification.service.js';

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
      // decrement counters and fetch updated count in one round-trip
      const updated = await User.findByIdAndUpdate(
        channelObjId,
        { $inc: { subscribersCount: -1 } },
        { new: true, select: 'subscribersCount' },
      );
      await User.findByIdAndUpdate(userId, { $inc: { subscribedToCount: -1 } });
      return { subscribed: false, subscribersCount: updated?.subscribersCount ?? 0 };
    }

    let subscribersCount = channel.subscribersCount ?? 0;
    try {
      await Subscription.create({ subscriber: userId, channel: channelObjId });
      // increment counters and fetch updated count in one round-trip
      const updated = await User.findByIdAndUpdate(
        channelObjId,
        { $inc: { subscribersCount: 1 } },
        { new: true, select: 'subscribersCount' },
      );
      await User.findByIdAndUpdate(userId, { $inc: { subscribedToCount: 1 } });
      subscribersCount = updated?.subscribersCount ?? subscribersCount + 1;
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: number }).code === 11000) return { subscribed: true, subscribersCount };
      throw err;
    }

    // Notify channel owner on new subscription (fire-and-forget)
    void notificationService.createNotification({
      recipient: channelObjId,
      sender: userId,
      type: 'SUBSCRIBE',
      referenceId: channelObjId,
      referenceModel: 'User',
    }).catch(() => {});

    return { subscribed: true, subscribersCount };
  }
  async getUserChannelSubscribers(channelId: string, page = 1, limit = 10) {
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      throw new ApiError(400, 'Invalid channel ID format');
    }

    const skip = (page - 1) * limit;

    const result = await Subscription.aggregate([
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
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          docs: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const total = result[0]?.metadata[0]?.total ?? 0;
    return {
      docs: result[0]?.docs ?? [],
      totalDocs: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
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
