import { useQuery } from "@tanstack/react-query";
import { PlaySquare } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchSubscribedChannels, fetchChannelVideos, queryKeys } from "../lib/queries";
import { VideoCard } from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";
import type { Video } from "../types";

function ChannelSection({ channelId, channelUsername, channelFullname, channelAvatar }: {
  channelId: string;
  channelUsername: string;
  channelFullname: string;
  channelAvatar?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.channelVideos(channelId),
    queryFn: () => fetchChannelVideos(channelId),
  });

  const videos: Video[] = data?.docs?.slice(0, 4) ?? [];

  if (!isLoading && videos.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <Link to={`/channel/${channelUsername}`}>
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden flex-shrink-0">
            {channelAvatar ? (
              <img src={channelAvatar} alt={channelFullname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                {channelFullname.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <Link
          to={`/channel/${channelUsername}`}
          className="text-sm font-semibold text-gray-900 dark:text-white hover:underline"
        >
          {channelFullname}
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Subscriptions() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const userId = user?._id ?? "";

  const { data: subs, isLoading, isError } = useQuery({
    queryKey: queryKeys.subscribedChannels(userId),
    queryFn: () => fetchSubscribedChannels(userId),
    enabled: !!userId,
  });

  if (authLoading) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <PlaySquare className="w-12 h-12 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to see videos from your subscribed channels.
        </p>
        <Link
          to="/login"
          className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <PlaySquare className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
      </div>

      {isLoading && (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-gray-500 dark:text-gray-400">Failed to load subscriptions.</p>
      )}

      {!isLoading && !isError && (!subs || subs.length === 0) && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p>You haven't subscribed to any channels yet.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            Browse videos
          </Link>
        </div>
      )}

      {!isLoading && !isError && subs && subs.length > 0 && (
        <div>
          {subs.map((sub) => (
            <ChannelSection
              key={sub._id}
              channelId={sub.channel._id}
              channelUsername={sub.channel.username}
              channelFullname={sub.channel.fullname}
              channelAvatar={sub.channel.avatar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
