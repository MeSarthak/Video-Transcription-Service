import mongoose, { type Types } from 'mongoose';
import { Notification } from './notification.model.js';
import { ApiError } from '../../lib/ApiError.js';

class NotificationService {
  async createNotification(data: {
    recipient: Types.ObjectId;
    sender: Types.ObjectId;
    type: 'VIDEO_LIKE' | 'COMMENT_LIKE' | 'TWEET_LIKE' | 'COMMENT' | 'SUBSCRIBE';
    referenceId: Types.ObjectId;
    referenceModel: 'Video' | 'Comment' | 'Tweet' | 'User';
  }) {
    if (String(data.recipient) === String(data.sender)) {
      return null;
    }

    return Notification.findOneAndUpdate(
      {
        recipient: data.recipient,
        sender: data.sender,
        type: data.type,
        referenceId: data.referenceId,
        isRead: false,
      },
      {
        ...data,
        isRead: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async getUserNotifications(
    userId: Types.ObjectId,
    page: number,
    limit: number,
    filter?: { type?: string; isRead?: boolean },
  ) {
    const matchStage: any = { recipient: userId };

    if (filter?.type) matchStage.type = filter.type;
    if (filter?.isRead !== undefined) matchStage.isRead = filter.isRead;

    const aggregateQuery = Notification.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'senderDetails',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $addFields: { sender: { $first: '$senderDetails' } } },
      { $project: { senderDetails: 0 } },
    ]);

    return Notification.aggregatePaginate(aggregateQuery, { page, limit });
  }

  async getUnreadCount(userId: Types.ObjectId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return { unreadCount: count };
  }

  async markAsRead(notificationId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new ApiError(400, 'Invalid notification ID');
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
      },
      { $set: { isRead: true } },
      { new: true },
    );

    if (!notification) {
      throw new ApiError(404, 'Notification not found or not accessible');
    }

    return notification;
  }

  async markAllAsRead(userId: Types.ObjectId) {
    await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }
}

export const notificationService = new NotificationService();
