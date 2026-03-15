import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  subscriber: Types.ObjectId;
  channel: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate subscriptions
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

// Fast: "who subscribed to this channel" and "what channels does this user follow"
subscriptionSchema.index({ channel: 1 });
subscriptionSchema.index({ subscriber: 1 });

export const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema,
);
