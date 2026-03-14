import mongoose, { type Types } from 'mongoose';
import { Comment } from './comment.model.js';
import { Video } from '../video/video.model.js';
import { ApiError } from '../../lib/ApiError.js';

class CommentService {
  async getVideoComments(
    videoId: string,
    page: number,
    limit: number,
    currentUserId?: Types.ObjectId,
  ) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid video ID format');
    }

    const matchStage = {
      video: new mongoose.Types.ObjectId(videoId),
    };

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $addFields: { owner: { $first: '$owner' } } },
      { $sort: { createdAt: -1 } },
    ];

    if (currentUserId) {
      pipeline.push(
        {
          $lookup: {
            from: 'likes',
            let: { commentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$targetId', '$$commentId'] },
                      { $eq: ['$targetType', 'comment'] },
                      { $eq: ['$likedBy', new mongoose.Types.ObjectId(String(currentUserId))] },
                    ],
                  },
                },
              },
            ],
            as: 'userLike',
          },
        },
        {
          $addFields: {
            isLiked: { $gt: [{ $size: '$userLike' }, 0] },
          },
        },
        { $project: { userLike: 0 } },
      );
    } else {
      pipeline.push({
        $addFields: {
          isLiked: false,
        },
      });
    }

    const aggregateQuery = Comment.aggregate(pipeline);

    return Comment.aggregatePaginate(aggregateQuery, {
      page,
      limit,
    });
  }

  async addComment(videoId: string, userId: Types.ObjectId, content: string) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid video ID format');
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, 'Video not found');

    const comment = await Comment.create({
      content,
      video: videoId,
      owner: userId,
    });

    // We will update the Video's comment count denormalized field
    await Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });

    // Note: notification creation is decoupled and can be added later or fired here

    return comment;
  }

  async updateComment(commentId: string, userId: Types.ObjectId, content: string) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, 'Invalid comment ID format');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');

    if (!comment.owner.equals(userId)) {
      throw new ApiError(403, 'Unauthorized to update this comment');
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  async deleteComment(commentId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw new ApiError(400, 'Invalid comment ID format');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, 'Comment not found');

    if (!comment.owner.equals(userId)) {
      throw new ApiError(403, 'Unauthorized to delete this comment');
    }

    await Comment.findByIdAndDelete(commentId);

    // Decrement the Video's comment count
    await Video.findByIdAndUpdate(comment.video, { $inc: { commentsCount: -1 } });

    return { deleted: true };
  }
}

export const commentService = new CommentService();
