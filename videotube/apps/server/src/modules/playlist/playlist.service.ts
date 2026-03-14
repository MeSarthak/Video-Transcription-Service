import mongoose, { type Types } from 'mongoose';
import { Playlist } from './playlist.model.js';
import { Video } from '../video/video.model.js';
import { ApiError } from '../../lib/ApiError.js';

class PlaylistService {
  async createPlaylist(name: string, description: string, ownerId: Types.ObjectId) {
    if (!name) throw new ApiError(400, 'Playlist name is required');

    return Playlist.create({
      name,
      description: description || '',
      owner: ownerId,
      videos: [],
    });
  }

  async getUserPlaylists(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid User ID');
    }

    return Playlist.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          name: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          totalVideos: { $size: '$videos' },
          firstVideo: { $arrayElemAt: ['$videos', 0] },
        },
      },
    ]);
  }

  async getPlaylistById(playlistId: string) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, 'Invalid Playlist ID');
    }

    // Example of paginating a populated array (we can just slice it via aggregation or select limit, here we use simple populate for brevity but can do more advanced slice if needed)
    const playlist = await Playlist.findById(playlistId)
      .populate({
        path: 'videos',
        select: 'title thumbnail duration views owner createdAt',
        populate: { path: 'owner', select: 'username fullname avatar' },
      })
      .populate('owner', 'username fullname avatar');

    if (!playlist) {
      throw new ApiError(404, 'Playlist not found');
    }

    playlist.videos = playlist.videos.filter(Boolean); // Sanity check for deleted videos
    return playlist;
  }

  async addVideoToPlaylist(playlistId: string, videoId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Playlist or Video ID');
    }

    const updated = await Playlist.findOneAndUpdate(
      {
        _id: playlistId,
        owner: userId,
        videos: { $ne: videoId },
      },
      { $addToSet: { videos: videoId } },
      { new: true },
    ).populate('videos', '_id title');

    if (!updated) {
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) throw new ApiError(404, 'Playlist not found');
      if (String(playlist.owner) !== String(userId)) throw new ApiError(403, 'Unauthorized');

      const video = await Video.findById(videoId).select('_id');
      if (!video) throw new ApiError(404, 'Video not found');

      throw new ApiError(400, 'Video already exists in this playlist');
    }

    return updated;
  }

  async removeVideoFromPlaylist(playlistId: string, videoId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, 'Invalid Playlist or Video ID');
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, 'Playlist not found');
    if (String(playlist.owner) !== String(userId)) throw new ApiError(403, 'Unauthorized');

    return Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true },
    );
  }

  async updatePlaylist(
    playlistId: string,
    data: { name?: string; description?: string },
    userId: Types.ObjectId,
  ) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, 'Invalid Playlist ID');
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, 'Playlist not found');
    if (String(playlist.owner) !== String(userId)) throw new ApiError(403, 'Unauthorized');

    if (data.name) playlist.name = data.name;
    if (data.description !== undefined) playlist.description = data.description;

    await playlist.save();
    return playlist;
  }

  async deletePlaylist(playlistId: string, userId: Types.ObjectId) {
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      throw new ApiError(400, 'Invalid Playlist ID');
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, 'Playlist not found');
    if (String(playlist.owner) !== String(userId)) throw new ApiError(403, 'Unauthorized');

    await Playlist.findByIdAndDelete(playlistId);
    return { deleted: true };
  }
}

export const playlistService = new PlaylistService();
