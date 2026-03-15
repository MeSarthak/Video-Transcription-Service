import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ITweet extends Document {
  _id: Types.ObjectId;
  content: string;
  owner: Types.ObjectId;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const tweetSchema = new Schema<ITweet>(
  {
    content: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Denormalized
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

tweetSchema.index({ owner: 1, createdAt: -1 });

export const Tweet = mongoose.model<ITweet>('Tweet', tweetSchema);
