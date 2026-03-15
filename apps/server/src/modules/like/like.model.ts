import mongoose, { Schema, type Document, type Types } from 'mongoose';

/**
 * Discriminated Like model.
 *
 * Instead of 3 nullable target fields (video?, comment?, tweet?), uses:
 *   targetType: "video" | "comment" | "tweet"
 *   targetId:   ObjectId
 *
 * Single compound unique index replaces 3 partial-filter indexes.
 */
export interface ILike extends Document {
  _id: Types.ObjectId;
  targetType: 'video' | 'comment' | 'tweet';
  targetId: Types.ObjectId;
  likedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    targetType: {
      type: String,
      enum: ['video', 'comment', 'tweet'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// One like per user per target — single compound unique index
likeSchema.index({ targetType: 1, targetId: 1, likedBy: 1 }, { unique: true });

// Fast lookups: "all likes on this target"
likeSchema.index({ targetType: 1, targetId: 1 });

export const Like = mongoose.model<ILike>('Like', likeSchema);
