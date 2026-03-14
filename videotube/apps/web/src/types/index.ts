export interface User {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoOwner {
  _id: string;
  username: string;
  fullname: string;
  avatar: string;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  masterPlaylist?: string;
  duration?: number;
  views: number;
  likesCount?: number;
  isPublished: boolean;
  status: 'pending' | 'processing' | 'published' | 'failed';
  uploadStatus: 'pending' | 'processing' | 'completed' | 'failed';
  owner: VideoOwner;
  ownerDetails?: VideoOwner; // from getAllVideos aggregate
  isLiked?: boolean;
  isSubscribed?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  video: string;
  owner: VideoOwner;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  _id: string;
  username: string;
  fullname: string;
  email: string;
  avatar: string;
  coverImage?: string;
  subscribersCount: number;
  channelsSubscribedToCount: number;
  isSubscribed: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface ToggleLikeResult {
  liked: boolean;
  likesCount: number;
}

export interface ToggleSubscriptionResult {
  subscribed: boolean;
  subscribersCount: number;
}

export interface Playlist {
  _id: string;
  name: string;
  description: string;
  owner: VideoOwner | string;
  videos: Video[];
  totalVideos?: number;
  firstVideo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistSummary {
  _id: string;
  name: string;
  description: string;
  totalVideos: number;
  firstVideo?: string;
  createdAt: string;
  updatedAt: string;
}
