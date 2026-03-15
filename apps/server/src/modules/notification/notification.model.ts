import mongoose, { Schema, type Document, type Types, type AggregatePaginateModel } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: 'VIDEO_LIKE' | 'COMMENT_LIKE' | 'TWEET_LIKE' | 'COMMENT' | 'SUBSCRIBE';
  referenceId: Types.ObjectId;
  referenceModel: 'Video' | 'Comment' | 'Tweet' | 'User';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['VIDEO_LIKE', 'COMMENT_LIKE', 'TWEET_LIKE', 'COMMENT', 'SUBSCRIBE'],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ['Video', 'Comment', 'Tweet', 'User'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Compound index for upsert deduplication
notificationSchema.index(
  { recipient: 1, sender: 1, type: 1, referenceId: 1, isRead: 1 },
  { name: 'unique_unread_notification' },
);

// Fetch user notifications, newest first
notificationSchema.index({ recipient: 1, createdAt: -1 });

notificationSchema.plugin(aggregatePaginate);

export const Notification = mongoose.model<
  INotification,
  AggregatePaginateModel<INotification>
>('Notification', notificationSchema);
