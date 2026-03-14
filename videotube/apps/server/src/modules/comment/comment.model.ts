import mongoose, { Schema, type Document, type Types, type AggregatePaginateModel } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

export interface IComment extends Document {
  _id: Types.ObjectId;
  content: string;
  video: Types.ObjectId;
  owner: Types.ObjectId;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true },
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Denormalized
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Paginate comments by video, newest first
commentSchema.index({ video: 1, createdAt: -1 });

commentSchema.plugin(aggregatePaginate);

export const Comment = mongoose.model<IComment, AggregatePaginateModel<IComment>>(
  'Comment',
  commentSchema,
);
