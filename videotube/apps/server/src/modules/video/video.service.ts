import mongoose, { type Types } from 'mongoose';
import { Video } from './video.model.js';
import { ApiError } from '../../lib/ApiError.js';
import { addVideoToQueue } from '../../queues/video.queue.js';
import { deleteBlobsByPrefix } from '../../pipeline/upload.js';
import { unlink } from 'node:fs/promises';
import { logger } from '../../lib/logger.js';

interface UploadHLSVideoParams {
  file: Express.Multer.File;
  title: string;
  description: string;
  ownerId: Types.ObjectId;
  subtitleLanguage: string;
  subtitleTask: 'transcribe' | 'translate';
  thumbnailPath?: string;
}

class VideoService {
  // ── Upload ──────────────────────────────────

  async uploadHLSVideo({
    file,
    title,
    description,
    ownerId,
    subtitleLanguage,
    subtitleTask,
    thumbnailPath,
  }: UploadHLSVideoParams) {
    if (!file) {
      throw new ApiError(400, 'Video file is required');
    }

    try {
      const video = await Video.create({
        title,
        description,
        owner: ownerId,
        status: 'pending',
        uploadStatus: 'pending',
        subtitles: {
          status: 'pending',
          language: subtitleLanguage,
          task: subtitleTask,
        },
      });

      logger.info(`Video DB record created: ${video._id}, Status: pending`);

      try {
        await addVideoToQueue({
          videoPath: file.path,
          videoId: String(video._id),
          userId: String(ownerId),
          title,
          description,
          subtitleLanguage,
          subtitleTask,
          thumbnailPath,
        });
        logger.info(`Video ${video._id} added to processing queue`);
      } catch (queueErr) {
        logger.error({ err: queueErr }, `Failed to queue video ${video._id}`);

        if (file.path) {
          await unlink(file.path).catch((err) =>
            logger.error({ err }, `Failed to cleanup file ${file.path}`),
          );
        }

        await Video.findByIdAndDelete(video._id);
        throw new ApiError(500, 'Failed to queue video for processing');
      }

      return video;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // ── Status ──────────────────────────────────

  async getVideoStatus(videoId: string) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid videoId');
    }

    const video = await Video.findById(videoId).select(
      'status uploadStatus errorMessage masterPlaylist thumbnail',
    );

    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    return video;
  }

  // ── Fetching / Listing ──────────────────────

  async getAllVideos(params: {
    page: number;
    limit: number;
    query?: string;
    sortBy: string;
    sortType: 'asc' | 'desc';
    userId?: string;
    tags?: string;
    uploadDate?: 'today' | 'week' | 'month' | 'year';
    durationMin?: number;
    durationMax?: number;
  }) {
    const matchStage: any = {
      isPublished: true,
      status: 'published',
    };

    if (params.query) {
      matchStage.$text = { $search: params.query };
    }

    if (params.userId) {
      if (!mongoose.Types.ObjectId.isValid(params.userId)) {
        throw new ApiError(400, 'Invalid user ID');
      }
      matchStage.owner = new mongoose.Types.ObjectId(params.userId);
    }

    if (params.tags) {
      const tagsArray = params.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagsArray.length > 0) {
        matchStage.tags = { $in: tagsArray };
      }
    }

    if (params.durationMin !== undefined || params.durationMax !== undefined) {
      matchStage.duration = {};
      if (params.durationMin !== undefined) matchStage.duration.$gte = params.durationMin;
      if (params.durationMax !== undefined) matchStage.duration.$lte = params.durationMax;
    }

    if (params.uploadDate) {
      let startDate = new Date();
      switch (params.uploadDate) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      matchStage.createdAt = { $gte: startDate };
    }

    const pipeline: any[] = [{ $match: matchStage }];

    // Sort
    let sortStage: any = {};
    if (params.sortBy === 'mostLiked') {
      sortStage = { likesCount: params.sortType === 'asc' ? 1 : -1 };
    } else if (params.sortBy === 'mostViewed') {
      sortStage = { views: params.sortType === 'asc' ? 1 : -1 };
    } else if (params.sortBy === 'createdAt') {
      sortStage = { createdAt: params.sortType === 'asc' ? 1 : -1 };
    } else {
      sortStage = { [params.sortBy]: params.sortType === 'asc' ? 1 : -1 };
    }

    // Since we use text index, if query is present, we might want to sort by textScore
    if (params.query && params.sortBy === 'createdAt') { // default fallback
      sortStage = { score: { $meta: 'textScore' }, ...sortStage };
    }

    pipeline.push({ $sort: sortStage });

    // Lookup owner
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerDetails',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $unwind: '$ownerDetails' },
    );

    // Facet for pagination
    const skip = (params.page - 1) * params.limit;
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: params.limit }],
      },
    });

    const result = await Video.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const docs = result[0]?.data || [];

    return {
      docs,
      totalDocs: total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
      hasNextPage: params.page * params.limit < total,
    };
  }

  async getVideoById(videoId: string, currentUserId?: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Video ID');
    }

    const pipeline: any[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
          isPublished: true,
        },
      },
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
    ];

    if (currentUserId) {
      pipeline.push(
        // Check if liked
        {
          $lookup: {
            from: 'likes',
            let: { vid: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$targetId', '$$vid'] },
                      { $eq: ['$targetType', 'video'] },
                      { $eq: ['$likedBy', new mongoose.Types.ObjectId(String(currentUserId))] },
                    ],
                  },
                },
              },
            ],
            as: 'userLike',
          },
        },
        // Check if subscribed
        {
          $lookup: {
            from: 'subscriptions',
            let: { channelId: '$owner._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$channel', '$$channelId'] },
                      { $eq: ['$subscriber', new mongoose.Types.ObjectId(String(currentUserId))] },
                    ],
                  },
                },
              },
            ],
            as: 'userSub',
          },
        },
        {
          $addFields: {
            isLiked: { $gt: [{ $size: '$userLike' }, 0] },
            isSubscribed: { $gt: [{ $size: '$userSub' }, 0] },
          },
        },
        { $project: { userLike: 0, userSub: 0 } },
      );
    } else {
      pipeline.push({
        $addFields: {
          isLiked: false,
          isSubscribed: false,
        },
      });
    }

    const result = await Video.aggregate(pipeline);
    if (!result?.length) {
      throw new ApiError(404, 'Video not found');
    }

    return result[0];
  }

  async getRelatedVideos(videoId: string, limit = 10) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Video ID');
    }

    const current = await Video.findById(videoId);
    if (!current) {
      throw new ApiError(404, 'Video not found');
    }

    // Try text search using current video title keywords
    const keywords = current.title
      .split(' ')
      .filter((w) => w.length > 3)
      .join(' ');

    const matchStage: any = {
      _id: { $ne: new mongoose.Types.ObjectId(videoId) },
      isPublished: true,
      status: 'published',
    };

    if (keywords) {
      matchStage.$text = { $search: keywords };
    }

    const result = await Video.aggregate([
      { $match: matchStage },
      // Fallback: if no keywords, we could just get from same owner
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'ownerDetails',
          pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
        },
      },
      { $unwind: '$ownerDetails' },
      { $limit: limit },
    ]);

    // If result is too small, fetch from same owner
    if (result.length < limit) {
      const more = await Video.aggregate([
        {
          $match: {
            _id: {
              $nin: [
                new mongoose.Types.ObjectId(videoId),
                ...result.map((r: any) => r._id),
              ],
            },
            owner: current.owner,
            isPublished: true,
            status: 'published',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'ownerDetails',
            pipeline: [{ $project: { username: 1, fullname: 1, avatar: 1 } }],
          },
        },
        { $unwind: '$ownerDetails' },
        { $limit: limit - result.length },
      ]);
      return [...result, ...more];
    }

    return result;
  }

  // ── Actions ─────────────────────────────────

  async incrementViewCount(videoId: string) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Video ID');
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    return video;
  }

  // ── Delete ───────────────────────────────────

  async deleteVideo(videoId: string, requesterId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Video ID');
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, 'Video not found');
    }

    if (video.owner.toString() !== requesterId.toString()) {
      throw new ApiError(403, 'You are not allowed to delete this video');
    }

    // Delete all blobs from Azure (segments, master playlist, thumbnail, subtitles)
    try {
      await deleteBlobsByPrefix(`${videoId}/`);
      logger.info(`Deleted Azure blobs for video ${videoId}`);
    } catch (err) {
      logger.error({ err }, `Failed to delete Azure blobs for video ${videoId}`);
      // Non-fatal — still remove DB record so the video is gone from the app
    }

    await Video.findByIdAndDelete(videoId);
    logger.info(`Video ${videoId} deleted from DB`);
  }
}

export const videoService = new VideoService();
