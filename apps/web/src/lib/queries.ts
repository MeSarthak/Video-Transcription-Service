import api from './api';
import type {
  Video,
  Comment,
  Channel,
  Playlist,
  PlaylistSummary,
  PaginatedResponse,
  ToggleLikeResult,
  ToggleSubscriptionResult,
  ApiResponse,
} from '../types';

// ── Video ────────────────────────────────────

export interface GetVideosParams {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: string;
  sortType?: 'asc' | 'desc';
  userId?: string;
}

export async function fetchVideos(params: GetVideosParams = {}): Promise<PaginatedResponse<Video>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Video>>>('/videos', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sortBy: params.sortBy ?? 'createdAt',
      sortType: params.sortType ?? 'desc',
      ...(params.query && { query: params.query }),
      ...(params.userId && { userId: params.userId }),
    },
  });
  return res.data.data;
}

export async function fetchVideoById(videoId: string): Promise<Video> {
  const res = await api.get<ApiResponse<Video>>(`/videos/${videoId}`);
  return res.data.data;
}

export async function fetchRelatedVideos(videoId: string): Promise<Video[]> {
  const res = await api.get<ApiResponse<Video[]>>(`/videos/${videoId}/related`);
  return res.data.data;
}

export async function incrementView(videoId: string): Promise<void> {
  await api.patch(`/videos/${videoId}/views`);
}

export async function deleteVideo(videoId: string): Promise<void> {
  await api.delete(`/videos/${videoId}`);
}

export async function addToWatchHistory(videoId: string): Promise<void> {
  await api.post(`/users/watch-history/${videoId}`);
}

export async function fetchVideoStatus(videoId: string): Promise<Video> {
  const res = await api.get<ApiResponse<Video>>(`/videos/status/${videoId}`);
  return res.data.data;
}

// ── Comments ─────────────────────────────────

export async function fetchComments(
  videoId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Comment>> {
  const res = await api.get<ApiResponse<PaginatedResponse<Comment>>>(`/comments/${videoId}`, {
    params: { page, limit },
  });
  return res.data.data;
}

export async function postComment(videoId: string, content: string): Promise<Comment> {
  const res = await api.post<ApiResponse<Comment>>(`/comments/${videoId}`, { content });
  return res.data.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(`/comments/c/${commentId}`);
}

// ── Likes ─────────────────────────────────────

export async function toggleVideoLike(videoId: string): Promise<ToggleLikeResult> {
  const res = await api.post<ApiResponse<ToggleLikeResult>>(`/likes/toggle/v/${videoId}`);
  return res.data.data;
}

export async function toggleCommentLike(commentId: string): Promise<ToggleLikeResult> {
  const res = await api.post<ApiResponse<ToggleLikeResult>>(`/likes/toggle/c/${commentId}`);
  return res.data.data;
}

// ── Subscriptions ─────────────────────────────

export async function toggleSubscription(channelId: string): Promise<ToggleSubscriptionResult> {
  const res = await api.post<ApiResponse<ToggleSubscriptionResult>>(
    `/subscriptions/c/${channelId}`,
  );
  return res.data.data;
}

// ── Channel ───────────────────────────────────

export async function fetchChannel(username: string): Promise<Channel> {
  const res = await api.get<ApiResponse<Channel>>(`/users/channel/${username}`);
  return res.data.data;
}

export async function fetchChannelVideos(userId: string): Promise<PaginatedResponse<Video>> {
  return fetchVideos({ userId, sortBy: 'createdAt', sortType: 'desc' });
}

// ── Liked videos ──────────────────────────────

export interface LikedVideoEntry {
  _id: string;
  video: Video;
  createdAt: string;
}

export async function fetchLikedVideos(page = 1, limit = 20): Promise<PaginatedResponse<LikedVideoEntry>> {
  const res = await api.get<ApiResponse<PaginatedResponse<LikedVideoEntry>>>('/likes/videos', {
    params: { page, limit },
  });
  return res.data.data;
}

// ── Watch history ─────────────────────────────

export interface WatchHistoryEntry {
  video: Video;
  watchedAt: string;
}

export async function fetchWatchHistory(page = 1, limit = 20): Promise<PaginatedResponse<WatchHistoryEntry>> {
  const res = await api.get<ApiResponse<PaginatedResponse<WatchHistoryEntry>>>(
    '/users/watch-history',
    { params: { page, limit } },
  );
  return res.data.data;
}

// ── Subscribed channels ───────────────────────

export interface SubscribedChannel {
  _id: string;
  channel: Channel;
}

export async function fetchSubscribedChannels(subscriberId: string): Promise<SubscribedChannel[]> {
  const res = await api.get<ApiResponse<SubscribedChannel[]>>(
    `/subscriptions/u/${subscriberId}`,
  );
  return res.data.data;
}

// ── Playlists ─────────────────────────────────

export async function fetchUserPlaylists(userId: string): Promise<PlaylistSummary[]> {
  const res = await api.get<ApiResponse<PlaylistSummary[]>>(`/playlists/user/${userId}`);
  return res.data.data;
}

export async function fetchPlaylistById(playlistId: string): Promise<Playlist> {
  const res = await api.get<ApiResponse<Playlist>>(`/playlists/${playlistId}`);
  return res.data.data;
}

export async function createPlaylist(name: string, description: string): Promise<Playlist> {
  const res = await api.post<ApiResponse<Playlist>>('/playlists', { name, description });
  return res.data.data;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await api.delete(`/playlists/${playlistId}`);
}

export async function addVideoToPlaylist(videoId: string, playlistId: string): Promise<Playlist> {
  const res = await api.patch<ApiResponse<Playlist>>(`/playlists/add/${videoId}/${playlistId}`);
  return res.data.data;
}

export async function removeVideoFromPlaylist(videoId: string, playlistId: string): Promise<Playlist> {
  const res = await api.patch<ApiResponse<Playlist>>(`/playlists/remove/${videoId}/${playlistId}`);
  return res.data.data;
}

// ── SAS Tokens ────────────────────────────────

export interface VideoSASUrlResponse {
  sasUrl: string;
  expiresAt: string;
  expiresIn: number;
}

export async function fetchVideoSASUrl(videoId: string): Promise<VideoSASUrlResponse> {
  const res = await api.get<ApiResponse<VideoSASUrlResponse>>(`/sas-tokens/download/${videoId}`);
  return res.data.data;
}

// ── Query Keys ────────────────────────────────

export const queryKeys = {
  videos: (params?: GetVideosParams) => ['videos', params] as const,
  video: (id: string) => ['video', id] as const,
  relatedVideos: (id: string) => ['relatedVideos', id] as const,
  comments: (videoId: string, page?: number) => ['comments', videoId, page] as const,
  channel: (username: string) => ['channel', username] as const,
  channelVideos: (userId: string) => ['channelVideos', userId] as const,
  videoStatus: (id: string) => ['videoStatus', id] as const,
  likedVideos: () => ['likedVideos'] as const,
  watchHistory: (page?: number) => ['watchHistory', page] as const,
  subscribedChannels: (userId: string) => ['subscribedChannels', userId] as const,
  userPlaylists: (userId: string) => ['playlists', 'user', userId] as const,
  playlist: (playlistId: string) => ['playlists', playlistId] as const,
  videoSASUrl: (videoId: string) => ['videoSASUrl', videoId] as const,
} as const;
