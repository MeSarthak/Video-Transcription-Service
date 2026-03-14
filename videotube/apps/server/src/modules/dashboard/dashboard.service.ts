import mongoose, { type Types } from 'mongoose';
import { Video } from '../video/video.model.js';
import { User } from '../user/user.model.js';
import { ApiError } from '../../lib/ApiError.js';

class DashboardService {
  async getChannelStats(userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid User ID');
    }

    const channelId = new mongoose.Types.ObjectId(String(userId));

    // Fast counters via User and Video collections
    const user = await User.findById(channelId).select('subscribersCount');

    const videoStats = await Video.aggregate([
      { $match: { owner: channelId } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likesCount' },
        },
      },
    ]);

    return {
      totalVideos: videoStats[0]?.totalVideos || 0,
      totalViews: videoStats[0]?.totalViews || 0,
      totalSubscribers: user?.subscribersCount || 0,
      totalLikes: videoStats[0]?.totalLikes || 0,
    };
  }

  async getChannelVideos(userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid User ID');
    }

    return Video.find({ owner: userId }).sort({ createdAt: -1 }).lean();
  }
}

export const dashboardService = new DashboardService();
