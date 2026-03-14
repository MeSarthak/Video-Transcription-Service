import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { fetchChannel, fetchChannelVideos, toggleSubscription, queryKeys } from "../lib/queries";
import { VideoCard } from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";

export function Channel() {
  const { username } = useParams<{ username: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: channel,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.channel(username!),
    queryFn: () => fetchChannel(username!),
    enabled: !!username,
  });

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: queryKeys.channelVideos(channel?._id ?? ""),
    queryFn: () => fetchChannelVideos(channel!._id),
    enabled: !!channel?._id,
  });

  const subMutation = useMutation({
    mutationFn: () => toggleSubscription(channel!._id),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.channel(username!), (old: any) =>
        old
          ? {
              ...old,
              isSubscribed: result.subscribed,
              subscribersCount: result.subscribersCount,
            }
          : old,
      );
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse max-w-screen-lg mx-auto">
        <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
        <div className="flex items-end gap-4 px-4 -mt-12">
          <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-900" />
          <div className="space-y-2 mb-2">
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Channel not found.
      </div>
    );
  }

  const videos = videosData?.docs ?? [];

  return (
    <div className="max-w-screen-lg mx-auto">
      {/* Cover image */}
      <div className="h-36 sm:h-48 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl overflow-hidden">
        {channel.coverImage && (
          <img src={channel.coverImage} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Channel info row */}
      <div className="flex flex-wrap items-end gap-4 px-4 -mt-10 sm:-mt-12 mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white dark:border-gray-900 bg-indigo-100 dark:bg-indigo-900 overflow-hidden flex-shrink-0">
          {channel.avatar ? (
            <img src={channel.avatar} alt={channel.fullname} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-indigo-600 text-2xl font-bold">
              {channel.fullname.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 mt-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{channel.fullname}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            @{channel.username} ·{" "}
            {channel.subscribersCount === 1
              ? "1 subscriber"
              : `${channel.subscribersCount} subscribers`}
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => subMutation.mutate()}
            disabled={subMutation.isPending}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              channel.isSubscribed
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                : "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
            }`}
          >
            {channel.isSubscribed ? (
              <>
                <BellOff className="w-4 h-4" /> Subscribed
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" /> Subscribe
              </>
            )}
          </button>
        )}
      </div>

      {/* Videos */}
      <div className="mt-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Videos</h2>

        {videosLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="mt-2 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!videosLoading && videos.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No videos yet.</p>
        )}

        {!videosLoading && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
